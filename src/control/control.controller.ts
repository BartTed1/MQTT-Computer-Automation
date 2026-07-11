import { Controller, Query, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ControlService } from './control.service';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';
import { ApiKeySystem } from '../common/guards/api-key-system.enum';

@ApiTags('control')
@Controller('control')
export class ControlController {
	constructor(private readonly controlService: ControlService) {}

	@ApiOperation({
		summary: 'Publish a command and observe its resulting event stream',
	})
	@ApiKeyAuth(ApiKeySystem.EXTERNAL_ORCHESTRATOR)
	@Sse('publish-and-observe')
	publishAndObserve(
		@Query('machineId') machineId: string,
		@Query('command') command: string,
		@Query('params') params: string,
	) {
		return this.controlService.publishAndObserve(machineId, command, params);
	}
}
