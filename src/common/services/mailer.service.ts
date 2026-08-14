import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendResetPasswordEmail(to: string, resetToken: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">EduSphere — Yêu cầu Khôi phục Mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại EduSphere. Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Đặt lại mật khẩu</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Liên kết này có hiệu lực trong 15 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2026 EduSphere E-Learning Platform</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"EduSphere Support" <${this.configService.get<string>('MAIL_USER', 'noreply@edusphere.vn')}>`,
        to,
        subject: '[EduSphere] Hướng dẫn đặt lại mật khẩu',
        html: htmlContent,
      });
      this.logger.log(`Email reset password đã được gửi thành công tới: ${to}`);
    } catch (error) {
      this.logger.warn(
        `Không thể gửi email tới ${to} (SMTP chưa được cấu hình hoặc lỗi): ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      this.logger.log(`[Dev Fallback Link]: ${resetUrl}`);
    }
  }
}
