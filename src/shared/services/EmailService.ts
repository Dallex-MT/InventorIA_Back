import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: parseInt(process.env['SMTP_PORT'] || '587'),
      secure: process.env['SMTP_SECURE'] === 'true', // true for 465, false for other ports
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const domain = process.env['DOMAIN'] || 'http://localhost:3001';
    const resetLink = `${domain}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"InventorIA Support"`, // sender address
      to: to, // list of receivers
      subject: 'Restablecimiento de Contraseña - InventorIA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">Restablecimiento de Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña en Inventoria.</p>
          <p>Para continuar, haz clic en el siguiente enlace:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
              Restablecer Contraseña
            </a>
          </p>
          <p>Este enlace <strong>expirará en 10 minutos</strong>.</p>
          <p>Si no solicitaste este cambio, por favor ignora este correo y tu contraseña permanecerá segura.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
            <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Correo de restablecimiento enviado a ${to}`);
    } catch (error) {
      console.error('Error enviando correo:', error);
      throw new Error('No se pudo enviar el correo de restablecimiento. Por favor verifique la configuración SMTP.');
    }
  }
}
