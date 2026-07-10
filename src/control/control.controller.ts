import { Controller, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ControlService } from './control.service';
import { ApiKeyAuth } from '../common/decorators/api-key-auth.decorator';

@ApiTags('control')
@Controller('control')
export class ControlController {
	constructor(private readonly controlService: ControlService) {}

	@ApiOperation({
		summary: 'Publish a command and observe its resulting event stream',
	})
	@ApiKeyAuth()
	@Sse('publish-and-observe')
	publishAndObserve() {
		return this.controlService.publishAndObserve();
	}
}
