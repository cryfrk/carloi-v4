import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Res } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('insurance/:insuranceRequestId/create')
  @UseGuards(JwtAuthGuard)
  createInsurancePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('insuranceRequestId') insuranceRequestId: string,
    @Req() request: {
      protocol: string;
      headers: Record<string, string | undefined>;
    },
    @Headers('x-forwarded-proto') forwardedProto?: string,
    @Headers('host') host?: string,
    @Headers('x-forwarded-host') forwardedHost?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const protocol = forwardedProto?.split(',')[0]?.trim() || request.protocol || 'http';
    const resolvedHost = forwardedHost?.split(',')[0]?.trim() || host || request.headers.host || 'localhost:3001';
    const baseUrl = `${protocol}://${resolvedHost}`;
    const customerIpAddress = forwardedFor?.split(',')[0]?.trim() || request.headers['x-real-ip'];

    return this.paymentsService.createInsurancePayment(
      user.userId,
      insuranceRequestId,
      baseUrl,
      customerIpAddress ?? null,
    );
  }

  @Post('garanti/callback')
  async handleGarantiCallback(
    @Body() body: Record<string, string | string[] | undefined>,
    @Headers('accept') acceptHeader: string | undefined,
    @Res() response: { status: (code: number) => { json: (payload: unknown) => unknown }; redirect: (code: number, url: string) => unknown },
  ) {
    const result = await this.paymentsService.handleGarantiCallback(body);

    if (acceptHeader?.includes('application/json') && body.mockClient === 'json') {
      return response.status(200).json(result);
    }

    return response.redirect(303, result.redirectUrl);
  }

  @Get('garanti/result')
  getGarantiResult(@Query('paymentId') paymentId?: string) {
    if (!paymentId) {
      throw new BadRequestException('paymentId zorunludur.');
    }

    return this.paymentsService.getGarantiResult(paymentId);
  }
}
