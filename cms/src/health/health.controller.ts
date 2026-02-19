import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the service' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
