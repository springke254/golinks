package com.golinks.golinks.service

import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

/**
 * Email service — sends real HTML emails via SMTP when configured,
 * otherwise falls back to console logging for local development.
 *
 * Design tokens (from tailwind.config.js):
 *   bg-main:       #191414       text-primary:    #FFFFFF
 *   bg-card:       #1E1A1A       text-secondary:  #B3B3B3
 *   bg-elevated:   #242020       text-muted:      #8A8A8A
 *   bg-soft:       #2E2A2A       text-inverse:    #191414
 *   border-strong: #3A3A3A       primary:         #1DB954
 *   border-subtle: #2A2A2A       danger:          #E02424
 *   warning:       #F59E0B
 *
 * Rules: no gradients, no border-radius, no emojis.
 */
@Service
class EmailService(
    private val mailSender: JavaMailSender? = null
) {

    private val logger = LoggerFactory.getLogger(EmailService::class.java)

    @Value("\${app.base-url:http://localhost:3000}")
    private lateinit var baseUrl: String

    @Value("\${spring.mail.host:}")
    private lateinit var smtpHost: String

    @Value("\${app.mail.from:noreply@golinks.io}")
    private lateinit var fromAddress: String

    private val smtpEnabled: Boolean
        get() = smtpHost.isNotBlank() && mailSender != null

    /* ────────────────────────────────────────────────────────
     *  SVG icons (inline, 20x20, stroke-based, email-safe)
     * ──────────────────────────────────────────────────────── */

    companion object {
        // Checkmark in circle — verification
        private val ICON_VERIFY = """
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        """.trimIndent()

        // Key — password reset
        private val ICON_KEY = """
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        """.trimIndent()

        // Shield alert — security
        private val ICON_SHIELD = """
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E02424" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        """.trimIndent()

        // Users — workspace invite
        private val ICON_USERS = """
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        """.trimIndent()

        // Link icon — brand logo
        private val ICON_LINK = """
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        """.trimIndent()
    }

    /* ────────────────────────────────────────────────────────
     *  Public email methods
     * ──────────────────────────────────────────────────────── */

    fun sendVerificationEmail(email: String, token: String) {
        val verificationUrl = "$baseUrl/verify-email?token=$token"
        val subject = "Verify your Golinks account"
        val html = buildVerificationEmail(verificationUrl)
        sendEmail(email, subject, html, "VERIFICATION", verificationUrl)
    }

    fun sendPasswordResetEmail(email: String, token: String) {
        val resetUrl = "$baseUrl/reset-password?token=$token"
        val subject = "Reset your Golinks password"
        val html = buildPasswordResetEmail(resetUrl)
        sendEmail(email, subject, html, "PASSWORD RESET", resetUrl)
    }

    fun sendSecurityAlertEmail(email: String, message: String) {
        val subject = "Security alert — Golinks account"
        val html = buildSecurityAlertEmail(message)
        sendEmail(email, subject, html, "SECURITY ALERT", null)
    }

    fun sendWorkspaceInviteEmail(
        email: String,
        inviterName: String,
        workspaceName: String,
        inviteToken: String,
        role: String
    ) {
        val inviteUrl = "$baseUrl/invite?token=$inviteToken"
        val subject = "You have been invited to $workspaceName on Golinks"
        val roleName = role.lowercase().replaceFirstChar { it.uppercase() }
        val html = buildWorkspaceInviteEmail(inviterName, workspaceName, roleName, inviteUrl)
        sendEmail(email, subject, html, "WORKSPACE INVITE", inviteUrl)
    }

    /* ────────────────────────────────────────────────────────
     *  Transport
     * ──────────────────────────────────────────────────────── */

    private fun sendEmail(to: String, subject: String, html: String, logType: String, url: String?) {
        if (smtpEnabled) {
            try {
                val message: MimeMessage = mailSender!!.createMimeMessage()
                val helper = MimeMessageHelper(message, true, "UTF-8")
                helper.setFrom(fromAddress)
                helper.setTo(to)
                helper.setSubject(subject)
                helper.setText(html, true)
                mailSender.send(message)
                logger.info("[$logType] Email sent to $to")
            } catch (ex: Exception) {
                logger.error("[$logType] Failed to send email to $to: ${ex.message}", ex)
                logToConsole(to, subject, logType, url)
            }
        } else {
            logToConsole(to, subject, logType, url)
        }
    }

    private fun logToConsole(to: String, subject: String, logType: String, url: String?) {
        logger.info("""
            |================================================
            | $logType EMAIL (SMTP not configured — console only)
            |================================================
            | To: $to
            | Subject: $subject
            ${if (url != null) "| Link: $url" else ""}
            |================================================
        """.trimMargin())
    }

    /* ────────────────────────────────────────────────────────
     *  Shared layout pieces
     * ──────────────────────────────────────────────────────── */

    /** Outer wrapper — sets the page-level background */
    private fun wrapperStart(): String = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="color-scheme" content="dark">
            <title>Golinks</title>
        </head>
        <body style="margin:0;padding:0;background-color:#191414;font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#191414;">
                <tr><td align="center" style="padding:48px 16px;">
    """.trimIndent()

    private fun wrapperEnd(): String = """
                </td></tr>
            </table>
        </body>
        </html>
    """.trimIndent()

    /** The card container — 480px, dark card bg, strong border, no radius */
    private fun cardStart(): String = """
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E1A1A;border:2px solid #3A3A3A;border-radius:0;max-width:480px;width:100%;">
    """.trimIndent()

    private fun cardEnd(): String = "</table>"

    /** Brand header bar — solid bg-elevated with link icon + wordmark */
    private fun brandHeader(): String = """
        <tr>
            <td style="padding:24px 32px;background-color:#242020;border-bottom:2px solid #3A3A3A;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="vertical-align:middle;padding-right:8px;">$ICON_LINK</td>
                        <td style="vertical-align:middle;">
                            <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Golinks</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    """.trimIndent()

    /** Primary CTA button — green bg, inverse text, bold, no radius */
    private fun ctaButton(text: String, url: String): String = """
        <a href="$url" target="_blank" style="display:inline-block;background-color:#1DB954;color:#191414;border:2px solid #1DB954;border-radius:0;padding:12px 32px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;mso-padding-alt:0;text-align:center;">
            <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:24pt">&nbsp;</i><![endif]-->
            <span style="mso-text-raise:12pt;">$text</span>
            <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
        </a>
    """.trimIndent()

    /** Secondary / ghost button (outlined) */
    private fun secondaryButton(text: String, url: String): String = """
        <a href="$url" target="_blank" style="display:inline-block;background-color:transparent;color:#B3B3B3;border:2px solid #3A3A3A;border-radius:0;padding:10px 24px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">$text</a>
    """.trimIndent()

    /** Full-width divider line */
    private fun divider(): String = """
        <tr><td style="padding:0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:2px solid #2A2A2A;font-size:0;height:0;line-height:0;">&nbsp;</td></tr>
            </table>
        </td></tr>
    """.trimIndent()

    /** Footer with muted text */
    private fun footer(text: String): String = """
        ${divider()}
        <tr><td style="padding:20px 32px 28px;">
            <p style="color:#8A8A8A;font-size:12px;line-height:1.5;margin:0;">$text</p>
            <p style="color:#3A3A3A;font-size:11px;margin:8px 0 0;">
                Golinks &mdash; Modern link management for teams
            </p>
        </td></tr>
    """.trimIndent()

    /* ────────────────────────────────────────────────────────
     *  Individual email builders
     * ──────────────────────────────────────────────────────── */

    private fun buildVerificationEmail(verificationUrl: String): String {
        return """
        ${wrapperStart()}
            ${cardStart()}
                ${brandHeader()}

                <!-- Icon -->
                <tr><td style="padding:28px 32px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color:#242020;border:2px solid #3A3A3A;border-radius:0;padding:14px;" align="center">
                            $ICON_VERIFY
                        </td></tr>
                    </table>
                </td></tr>

                <!-- Heading -->
                <tr><td style="padding:20px 32px 0;" align="center">
                    <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Verify Your Email Address</h1>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:12px 32px 0;" align="center">
                    <p style="color:#B3B3B3;font-size:14px;line-height:1.6;margin:0;max-width:380px;">
                        Thank you for creating a Golinks account. Please confirm your email address by clicking the button below to activate your account.
                    </p>
                </td></tr>

                <!-- CTA -->
                <tr><td style="padding:28px 32px 8px;" align="center">
                    ${ctaButton("Verify Email Address", verificationUrl)}
                </td></tr>

                <!-- Fallback link -->
                <tr><td style="padding:8px 32px 24px;" align="center">
                    <p style="color:#8A8A8A;font-size:11px;line-height:1.5;margin:0;word-break:break-all;max-width:380px;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="$verificationUrl" style="color:#1DB954;text-decoration:underline;font-size:11px;">$verificationUrl</a>
                    </p>
                </td></tr>

                ${footer("If you did not create a Golinks account, you can safely ignore this email. No action is required.")}
            ${cardEnd()}
        ${wrapperEnd()}
        """.trimIndent()
    }

    private fun buildPasswordResetEmail(resetUrl: String): String {
        return """
        ${wrapperStart()}
            ${cardStart()}
                ${brandHeader()}

                <!-- Icon -->
                <tr><td style="padding:28px 32px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color:#242020;border:2px solid #3A3A3A;border-radius:0;padding:14px;" align="center">
                            $ICON_KEY
                        </td></tr>
                    </table>
                </td></tr>

                <!-- Heading -->
                <tr><td style="padding:20px 32px 0;" align="center">
                    <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Reset Your Password</h1>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:12px 32px 0;" align="center">
                    <p style="color:#B3B3B3;font-size:14px;line-height:1.6;margin:0;max-width:380px;">
                        We received a request to reset the password for your Golinks account. Click the button below to choose a new password.
                    </p>
                </td></tr>

                <!-- Expiry notice -->
                <tr><td style="padding:16px 32px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#242020;border:2px solid #3A3A3A;border-radius:0;">
                        <tr><td style="padding:12px 20px;">
                            <p style="color:#F59E0B;font-size:12px;font-weight:700;margin:0;">
                                &#9201; This link expires in 1 hour
                            </p>
                        </td></tr>
                    </table>
                </td></tr>

                <!-- CTA -->
                <tr><td style="padding:24px 32px 8px;" align="center">
                    ${ctaButton("Reset Password", resetUrl)}
                </td></tr>

                <!-- Fallback link -->
                <tr><td style="padding:8px 32px 24px;" align="center">
                    <p style="color:#8A8A8A;font-size:11px;line-height:1.5;margin:0;word-break:break-all;max-width:380px;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="$resetUrl" style="color:#1DB954;text-decoration:underline;font-size:11px;">$resetUrl</a>
                    </p>
                </td></tr>

                ${footer("If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.")}
            ${cardEnd()}
        ${wrapperEnd()}
        """.trimIndent()
    }

    private fun buildSecurityAlertEmail(alertMessage: String): String {
        val settingsUrl = "$baseUrl/settings"
        return """
        ${wrapperStart()}
            ${cardStart()}
                ${brandHeader()}

                <!-- Icon -->
                <tr><td style="padding:28px 32px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color:#242020;border:2px solid #E02424;border-radius:0;padding:14px;" align="center">
                            $ICON_SHIELD
                        </td></tr>
                    </table>
                </td></tr>

                <!-- Heading -->
                <tr><td style="padding:20px 32px 0;" align="center">
                    <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Security Alert</h1>
                </td></tr>

                <!-- Alert box -->
                <tr><td style="padding:16px 32px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#242020;border:2px solid #E02424;border-radius:0;">
                        <tr><td style="padding:16px 20px;">
                            <p style="color:#FFFFFF;font-size:14px;line-height:1.6;margin:0;">$alertMessage</p>
                        </td></tr>
                    </table>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:16px 32px 0;" align="center">
                    <p style="color:#B3B3B3;font-size:14px;line-height:1.6;margin:0;max-width:380px;">
                        If this activity was not performed by you, we strongly recommend reviewing your account security settings immediately.
                    </p>
                </td></tr>

                <!-- CTA -->
                <tr><td style="padding:24px 32px 24px;" align="center">
                    ${ctaButton("Review Account Settings", settingsUrl)}
                </td></tr>

                ${footer("If this was you, no action is required. This notification is sent automatically whenever significant account activity is detected.")}
            ${cardEnd()}
        ${wrapperEnd()}
        """.trimIndent()
    }

    private fun buildWorkspaceInviteEmail(
        inviterName: String,
        workspaceName: String,
        roleName: String,
        inviteUrl: String
    ): String {
        return """
        ${wrapperStart()}
            ${cardStart()}
                ${brandHeader()}

                <!-- Icon -->
                <tr><td style="padding:28px 32px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color:#242020;border:2px solid #3A3A3A;border-radius:0;padding:14px;" align="center">
                            $ICON_USERS
                        </td></tr>
                    </table>
                </td></tr>

                <!-- Heading -->
                <tr><td style="padding:20px 32px 0;" align="center">
                    <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Workspace Invitation</h1>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:12px 32px 0;" align="center">
                    <p style="color:#B3B3B3;font-size:14px;line-height:1.6;margin:0;max-width:380px;">
                        <span style="color:#FFFFFF;font-weight:700;">$inviterName</span> has invited you to join a workspace on Golinks.
                    </p>
                </td></tr>

                <!-- Invite details card -->
                <tr><td style="padding:20px 32px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#242020;border:2px solid #3A3A3A;border-radius:0;">
                        <tr>
                            <td style="padding:16px 20px;border-bottom:2px solid #2A2A2A;">
                                <p style="color:#8A8A8A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 4px;">Workspace</p>
                                <p style="color:#FFFFFF;font-size:16px;font-weight:700;margin:0;">$workspaceName</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:16px 20px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td width="50%" style="vertical-align:top;">
                                            <p style="color:#8A8A8A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 4px;">Your Role</p>
                                            <p style="color:#1DB954;font-size:14px;font-weight:700;margin:0;">$roleName</p>
                                        </td>
                                        <td width="50%" style="vertical-align:top;">
                                            <p style="color:#8A8A8A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 4px;">Invited By</p>
                                            <p style="color:#FFFFFF;font-size:14px;font-weight:600;margin:0;">$inviterName</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <!-- CTA -->
                <tr><td style="padding:28px 32px 8px;" align="center">
                    ${ctaButton("Accept Invitation", inviteUrl)}
                </td></tr>

                <!-- Fallback link -->
                <tr><td style="padding:8px 32px 24px;" align="center">
                    <p style="color:#8A8A8A;font-size:11px;line-height:1.5;margin:0;word-break:break-all;max-width:380px;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="$inviteUrl" style="color:#1DB954;text-decoration:underline;font-size:11px;">$inviteUrl</a>
                    </p>
                </td></tr>

                ${footer("This invitation expires in 7 days. If you were not expecting this invitation, you can safely ignore this email.")}
            ${cardEnd()}
        ${wrapperEnd()}
        """.trimIndent()
    }
}
