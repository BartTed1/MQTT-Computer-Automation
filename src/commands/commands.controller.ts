import { Controller, Sse } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @ApiKeyAuth()
  @Sse('publish-and-observe')
  publishAndObserve() {
    return this.commandsService.publishAndObserve();
  }
}
