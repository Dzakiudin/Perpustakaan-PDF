import nodemailer from "nodemailer";

// Konfigurasi ini menggunakan SMTP dari platform seperti Mailtrap, SendGrid, atau Gmail
// Untuk testing di development, direkomendasikan menggunakan Mailtrap (https://mailtrap.io)
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER || "test_user",
        pass: process.env.SMTP_PASS || "test_pass",
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: '"Book-in Notifications" <noreply@bookin.local>',
            to,
            subject,
            html,
        });
        console.log("Email Notification sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
};
