import { Module } from '@nestjs/common';
import { ControlController } from './control.controller';
import { ControlService } from './control.service';
import { CommonModule } from '../common/common.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
	imports: [CommonModule, MqttModule],
	controllers: [ControlController],
	providers: [ControlService],
})
export class ControlModule {}
