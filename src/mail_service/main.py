"""
Mail service for OdooXAmalthea.

This module provides email functionality using SMTP with app passwords.
"""

import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailService:
    """Email service class for sending emails via SMTP."""

    def __init__(self):
        """Initialize email service with SMTP configuration from environment variables."""
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', 'exptrackerodoo@gmail.com')
        self.smtp_app_password = os.getenv('SMTP_APP_PASSWORD', 'qwurtvmipxnpspxb')

        if not all([self.smtp_username, self.smtp_app_password]):
            raise ValueError(
                "SMTP credentials not found. Please set SMTP_USERNAME and SMTP_APP_PASSWORD environment variables.\n"
                "For Gmail:\n"
                "1. Enable 2-factor authentication\n"
                "2. Go to Google Account settings > Security > App passwords\n"
                "3. Generate a new app password for 'Mail'\n"
                "4. Set SMTP_USERNAME to your Gmail address\n"
                "5. Set SMTP_APP_PASSWORD to the generated 16-character password"
            )

    def send_credentials_email(self, recipient_email: str, full_name: str, password: str) -> Dict[str, Any]:
        """
        Send user credentials via email.

        Args:
            recipient_email (str): Email address of the recipient
            full_name (str): Full name of the user
            password (str): User's password (will be sent in plain text)

        Returns:
            Dict[str, Any]: Response with success status and message
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your OdooXAmalthea Account Credentials"
            message["From"] = self.smtp_username
            message["To"] = recipient_email

            # Create HTML email content
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #333; text-align: center; margin-bottom: 30px;">
                        Welcome to OdooXAmalthea!
                    </h1>

                    <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin-top: 0;">Account Details</h2>
                        <p><strong>Full Name:</strong> {full_name}</p>
                        <p><strong>Email:</strong> {recipient_email}</p>
                        <p><strong>Password:</strong> <code style="background-color: #f1f2f6; padding: 2px 6px; border-radius: 3px;">{password}</code></p>
                    </div>

                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="color: #856404; margin-top: 0;">⚠️ Security Notice</h3>
                        <p style="margin-bottom: 0;">
                            For security reasons, please change your password after your first login.
                            You can update your password in your account settings.
                        </p>
                    </div>

                    <div style="text-align: center; color: #666; font-size: 14px;">
                        <p>If you have any questions, please contact your system administrator.</p>
                        <p>This is an automated message from OdooXAmalthea system.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Create plain text version as well
            text_content = f"""
            Welcome to OdooXAmalthea!

            Account Details:
            Full Name: {full_name}
            Email: {recipient_email}
            Password: {password}

            Security Notice:
            For security reasons, please change your password after your first login.
            You can update your password in your account settings.

            If you have any questions, please contact your system administrator.
            This is an automated message from OdooXAmalthea system.
            """

            # Attach both versions
            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")

            message.attach(part1)
            message.attach(part2)

            # Create SSL context
            context = ssl.create_default_context()

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_app_password)
                server.sendmail(self.smtp_username, recipient_email, message.as_string())

            logger.info(f"Credentials email sent successfully to {recipient_email}")
            return {
                "success": True,
                "message": f"Credentials sent successfully to {recipient_email}"
            }

        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to send email: {str(e)}"
            }

    def send_notification_email(self, recipient_email: str, subject: str, message_body: str) -> Dict[str, Any]:
        """
        Send a general notification email.

        Args:
            recipient_email (str): Email address of the recipient
            subject (str): Email subject
            message_body (str): Email body content (can be HTML)

        Returns:
            Dict[str, Any]: Response with success status and message
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.smtp_username
            message["To"] = recipient_email

            # Create both plain text and HTML versions
            text_content = message_body if message_body else "Notification from OdooXAmalthea"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                    <p>{message_body or 'Notification from OdooXAmalthea'}</p>
                </div>
            </body>
            </html>
            """

            # Attach both versions
            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")

            message.attach(part1)
            message.attach(part2)

            # Create SSL context
            context = ssl.create_default_context()

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_app_password)
                server.sendmail(self.smtp_username, recipient_email, message.as_string())

            logger.info(f"Notification email sent successfully to {recipient_email}")
            return {
                "success": True,
                "message": f"Notification sent successfully to {recipient_email}"
            }

        except Exception as e:
            logger.error(f"Failed to send notification email to {recipient_email}: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to send email: {str(e)}"
            }


# Global email service instance
_email_service = None


def get_email_service() -> EmailService:
    """Get the global email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


def send_credentials_email(recipient_email: str, full_name: str, password: str) -> Dict[str, Any]:
    """
    Convenience function to send credentials email.

    Args:
        recipient_email (str): Email address of the recipient
        full_name (str): Full name of the user
        password (str): User's password

    Returns:
        Dict[str, Any]: Response with success status and message
    """
    service = get_email_service()
    return service.send_credentials_email(recipient_email, full_name, password)


def send_notification_email(recipient_email: str, subject: str, message_body: str) -> Dict[str, Any]:
    """
    Convenience function to send notification email.

    Args:
        recipient_email (str): Email address of the recipient
        subject (str): Email subject
        message_body (str): Email body content

    Returns:
        Dict[str, Any]: Response with success status and message
    """
    service = get_email_service()
    return service.send_notification_email(recipient_email, subject, message_body)
