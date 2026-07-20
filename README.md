# mqtt-windows-automation

## Description

A NestJS command-and-control backend for remotely triggering automation on a fleet of
"controlled" machines (typically Windows PCs) over MQTT. External systems talk to it
over a plain HTTP/SSE API — they never need an MQTT client themselves. The service embeds
its own MQTT broker ([aedes](https://github.com/moscajs/aedes)) in the same process, so
there's no separate broker to deploy. Machines must be registered and authenticate to the
broker with per-machine credentials; a topic-level ACL restricts each machine to its own
command/event channel.

## Opis

Backend w NestJS do zdalnego wyzwalania automatyzacji na flocie "kontrolowanych" maszyn
(zwykle komputerów z Windowsem) przez MQTT. Systemy zewnętrzne komunikują się z nim po
zwykłym HTTP/SSE — nie potrzebują własnego klienta MQTT. Usługa ma wbudowany własny broker
MQTT ([aedes](https://github.com/moscajs/aedes)) działający w tym samym procesie, więc nie
trzeba wdrażać osobnego brokera. Maszyny muszą się zarejestrować i uwierzytelnić do brokera
własnymi poświadczeniami; ACL na poziomie tematów ogranicza każdą maszynę wyłącznie do jej
własnego kanału komend/zdarzeń.

---

## Architecture

```
External orchestrator                  This app (single process)                Controlled machine
──────────────────────                 ──────────────────────────                ──────────────────
                                        ┌─────────────────────────┐
                                        │ RegistrationController  │◄──────── POST /registration/self
                                        │ RegistrationService     │ (ApiKeyGuard: EXECUTION_SYS) 
                                        │  → SQLite (machines)    │
                                        |                         |
POST /registration/confirm ──────────►  │                         |
DELETE /registration/revoke/:id         |                         |
(ApiKeyGuard: EXTERNAL_ORCHESTRATOR)    └─────────────────────────┘
                                        │                         |
GET /control/publish-and-observe ────►  │  ControlController      │
(SSE, ApiKeyGuard: EXTERNAL_ORCHESTRATOR)   ControlService        │
                                        └───── │ ─────────────────┘
                                        │      ▼                  │
                                        │ MqttBrokerService       │
                                        │ (embedded aedes broker, │────────► machines/{id}/in
                                        │  TLS or plaintext,      │          (signed, timestamped;
                                        │  per-machine auth + ACL)│          machine subscribes)
                                        └───── │ ─────────────────┘◄──────── machines/{id}/out
                                        │      ▼                  │           (machine publishes)
GET /security/public-key ────────────►  │  SecurityController     │
(no auth — see MQTT security model)     │  CommandSigningService  │
                                        └─────────────────────────┘
```

- **HTTP/SSE layer** (`ControlController`, `RegistrationController`, `SecurityController`) —
  the first two are guarded by `ApiKeyGuard`, one API key per calling system
  (`EXECUTION_SYS`, `EXTERNAL_ORCHESTRATOR`); `SecurityController` is deliberately
  unauthenticated (see "MQTT security model").
- **MQTT layer** (`MqttBrokerService`) — an embedded `aedes` broker. It is also the only
  component that talks MQTT to the outside world; `ControlService` never touches MQTT
  directly, it goes through the `MqttCommunication` interface.
- **Persistence** (`PersistenceModule`) — SQLite via `better-sqlite3` + Drizzle ORM,
  a single `machines` table tracking registration status and hashed secrets.

## How it works

### 1. Machine registration

1. A machine (or whatever provisions it) calls `POST /registration/self` with a
   `machineId` (UUID v4) and a `machineSecret` (36-char string) it generates itself.
   The secret is hashed (scrypt) and stored; the response is an encrypted, time-limited
   token containing the plaintext secret.
2. That token is handed to a trusted external orchestrator, which calls
   `POST /registration/confirm` to flip the machine's status to `confirmed`. Only
   `confirmed` machines are allowed to authenticate to the MQTT broker.
3. `DELETE /registration/revoke/:machineId` revokes a machine, immediately blocking
   further MQTT authentication for it.

### 2. Sending a command

`GET /control/publish-and-observe?machineId=...&command=...&params=a,b,c` (Server-Sent
Events):

1. `ControlService` takes a per-machine lock (rejects a second concurrent command for
   the same machine with an error).
2. It publishes a signed command to `machines/{machineId}/in` and subscribes to
   `machines/{machineId}/out`:
   ```json
   {
     "machineId": "...",
     "command": "...",
     "params": ["..."],
     "timestamp": 1753000000,
     "signature": "base64-ed25519-signature"
   }
   ```
   See "4. Command signing" below for how `signature` is computed and how a client
   should verify it.
3. Every message the machine publishes on `.../out` is forwarded to the SSE client as
   an event, until the machine publishes the sentinel `==COMPLETED==`, which ends the
   stream successfully.
4. A rolling timeout (`COMMAND_TIMEOUT_SECONDS`, reset on every message from the
   machine) ends the stream with an error if the machine goes silent.
5. The lock is always released on completion, error, or client disconnect.

### 3. The controlled-machine side

A machine app needs to:

- Connect to the broker (TLS if configured, else plaintext) with MQTT username =
  `machineId`, password = `machineSecret` from step 1.
- Fetch the server's Ed25519 public key from `GET /security/public-key` at startup
  (cache it — it's a server-wide key, not rotated per command).
- Subscribe to `machines/{machineId}/in` (its only allowed subscription).
- Verify the `signature`/`timestamp` of every message received on `.../in` (see
  "4. Command signing") before executing it; reject invalid or stale ones.
- Publish progress/status strings to `machines/{machineId}/out` (its only allowed
  publish target), ending with the literal string `==COMPLETED==`.

See `testing-app/fake_machine.py` for a working reference implementation.

### 4. Command signing

Every command published to `machines/{machineId}/in` is signed by the server with a
single, server-wide Ed25519 keypair (`COMMAND_SIGNING_PRIVATE_KEY_PATH`) so that a
client can verify authenticity and freshness independently of transport-level trust
(TLS, broker ACL). This is implemented by `CommandSigningService`
(`src/common/security/command-signing.service.ts`).

- **What's signed**: a canonical, delimiter-joined string (not re-serialized JSON, to
  avoid cross-language JSON-canonicalization pitfalls) built by
  `buildCanonicalCommandString` (`src/control/command-canonical-payload.ts`):
  ```
  machineId + '\x1f' + command + '\x1f' + params.join(',') + '\x1f' + timestamp
  ```
  (`\x1f` is the ASCII Unit Separator — it cannot appear in a UUID `machineId` or a
  command name, so field boundaries stay unambiguous.) `timestamp` is Unix seconds.
- **Signature**: `crypto.sign(null, canonicalString, privateKey)` (Ed25519 needs no
  digest algorithm), base64-encoded into the `signature` field.
- **Verifying client-side**: fetch the PEM public key from `GET /security/public-key`,
  reconstruct the same canonical string from the received JSON fields, and verify the
  signature against it. Also check `machineId` matches the client's own ID, and reject
  if `abs(now - timestamp)` exceeds a client-chosen replay window (`fake_machine.py`
  defaults to 60s via `--max-age-seconds`) — this replay window is enforced entirely
  client-side; the server only stamps the current time.

## MQTT security model

- **Authentication**: `MqttBrokerService` implements aedes's `authenticate` hook —
  username must be a registered, `confirmed` `machineId`; password is checked against
  the stored `machineSecretHash` (scrypt, timing-safe compare). Unknown/unconfirmed
  machines or wrong secrets are rejected at CONNECT.
- **Authorization (ACL)**: `authorizeSubscribe`/`authorizePublish` restrict an
  authenticated client to `machines/{ownMachineId}/in` (subscribe only) and
  `machines/{ownMachineId}/out` (publish only). Any other topic is denied.
- **Server-side access**: `MqttBrokerService.publish()`/`.subscribe()` call aedes's
  in-process API directly, bypassing these hooks entirely — the server itself always
  has full broker access, independent of the machine ACL.
- **Transport**: if `MQTT_TLS_CERT_PATH`/`MQTT_TLS_KEY_PATH` are set, the broker serves
  TLS only, on `MQTT_TLS_PORT` (default `8883`); the plaintext port is not opened at
  all. Without them it falls back to plaintext on port `1883`, with a startup warning.
- **Command authenticity**: every message published to `.../in` is signed with a
  server-wide Ed25519 key (`COMMAND_SIGNING_PRIVATE_KEY_PATH`, see "4. Command
  signing"), so a client can verify a command really came from this server and hasn't
  been tampered with or replayed, independent of transport/broker trust. The
  corresponding public key is served unauthenticated at `GET /security/public-key` —
  it carries no confidentiality requirement (it only grants verification, never
  signing, capability), and gating it behind an API key would force embedding one
  system-wide credential into every deployed machine image, which is a larger blast
  radius than what a machine holds today (an MQTT credential ACL'd to its own two
  topics).

## REST API

| Method | Path                              | Auth (API key system)  | Purpose                                  |
|--------|-----------------------------------|-------------------------|-------------------------------------------|
| POST   | `/registration/self`              | `EXECUTION_SYS`         | Self-register a machine                   |
| POST   | `/registration/confirm`           | `EXTERNAL_ORCHESTRATOR` | Confirm a pending registration             |
| DELETE | `/registration/revoke/:machineId` | `EXTERNAL_ORCHESTRATOR` | Revoke a machine                           |
| GET    | `/control/publish-and-observe`    | `EXTERNAL_ORCHESTRATOR` | Send a command, stream results over SSE    |
| GET    | `/security/public-key`            | none (unauthenticated)  | Fetch the server's Ed25519 public key for command-signature verification |

API key is passed as the `apiKey` query parameter. Swagger UI is served at `/docs`.

## Environment variables

| Variable                        | Required | Default              | Purpose                                                        |
|----------------------------------|----------|-----------------------|------------------------------------------------------------------|
| `API_KEY_EXECUTION_SYS`          | yes      | —                     | API key for the `EXECUTION_SYS` caller                          |
| `API_KEY_EXTERNAL_ORCHESTRATOR`  | yes      | —                     | API key for the `EXTERNAL_ORCHESTRATOR` caller                  |
| `REGISTRATION_TOKEN_KEY`         | yes      | —                     | 32-byte hex AES-256-GCM key for registration tokens (`openssl rand -hex 32`) |
| `REGISTRATION_TOKEN_TTL_MINUTES` | yes      | —                     | Registration token expiry                                       |
| `COMMAND_TIMEOUT_SECONDS`        | yes      | —                     | Rolling inactivity timeout for `publish-and-observe`             |
| `DATABASE_PATH`                  | no       | `./data/db.sqlite`    | SQLite file path (`:memory:` for in-memory)                     |
| `MQTT_TLS_CERT_PATH`             | no       | unset (plaintext)     | TLS certificate for the MQTT broker                             |
| `MQTT_TLS_KEY_PATH`              | no       | unset (plaintext)     | TLS private key for the MQTT broker                             |
| `MQTT_TLS_PORT`                  | no       | `8883`                | Port for the MQTT broker when TLS is enabled                    |
| `COMMAND_SIGNING_PRIVATE_KEY_PATH` | yes    | —                     | Ed25519 private key (PEM) used to sign every command (`openssl genpkey -algorithm ed25519`) |

See `.env.example` for a template.

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values above

# required: server keypair used to sign every command
# (needs real OpenSSL 3.x — macOS's default /usr/bin/openssl is LibreSSL and
# doesn't support `genpkey -algorithm ed25519`; use `brew install openssl@3`
# and its full path if that's your situation)
mkdir -p certs
openssl genpkey -algorithm ed25519 -out certs/command-signing.key

# optional: local dev TLS cert for the MQTT broker
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/mqtt-server.key -out certs/mqtt-server.crt \
  -days 825 -subj "/CN=localhost"

npm run start:dev
```

Other run modes: `npm run start` (no watch), `npm run build && npm run start:prod`.

## Testing

```bash
npm run test        # unit tests (Jest)
npm run test:cov    # unit tests with coverage
npm run test:e2e    # Nest e2e tests
```

`testing-app/` contains standalone Python scripts (`fake_machine.py`,
`trigger_command.py`) for manually exercising the full flow — registration, MQTT auth/ACL,
command/event streaming, timeouts — without a real controlled machine. See
`testing-app/README.md`.

## Project layout

```
src/
  control/       HTTP/SSE endpoint that publishes signed commands and streams back events
  registration/  Machine self-registration / confirmation / revocation
  mqtt/          Embedded aedes broker: auth, ACL, TLS, pub/sub interface
  security/      Serves the server's Ed25519 public key for command-signature verification
  persistence/   SQLite (Drizzle ORM) machines repository
  common/        API key guard, AES-GCM token encryption, scrypt secret hashing, Ed25519 command signing
testing-app/     Python tools for manual end-to-end testing (not part of the Nest app)
```
