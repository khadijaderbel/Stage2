<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Address;

class EmailService
{
    public function __construct(
        private MailerInterface $mailer,
        private string $senderEmail,
        private string $senderName
    ) {
    }

    public function sendVerificationCode(User $user, string $newEmail, string $code): bool
    {
        try {
            $email = (new Email())
                ->from(new Address($this->senderEmail, $this->senderName))
                ->to(new Address($newEmail))
                ->replyTo(new Address($this->senderEmail, 'Support NOVAWIN'))
                ->subject('🔐 NOVAWIN - Code de vérification')
                ->html($this->getVerificationEmailTemplate($user, $code, $newEmail))
                ->text($this->getVerificationEmailText($user, $code, $newEmail));

            $this->mailer->send($email);
            return true;
        } catch (\Exception $e) {
            error_log('Erreur envoi email: ' . $e->getMessage());
            return false;
        }
    }

    public function sendEmailChangeConfirmation(User $user, string $oldEmail, string $newEmail): bool
    {
        try {
            $email = (new Email())
                ->from(new Address($this->senderEmail, $this->senderName))
                ->to(new Address($user->getEmail()))
                ->replyTo(new Address($this->senderEmail, 'Support NOVAWIN'))
                ->subject('✅ NOVAWIN - Confirmation de changement d\'email')
                ->html($this->getEmailChangeTemplate($user, $oldEmail, $newEmail))
                ->text($this->getEmailChangeText($user, $oldEmail, $newEmail));

            $this->mailer->send($email);
            return true;
        } catch (\Exception $e) {
            error_log('Erreur envoi email confirmation: ' . $e->getMessage());
            return false;
        }
    }

    public function sendWelcomeEmail(User $user, string $password): bool
    {
        try {
            $email = (new Email())
                ->from(new Address($this->senderEmail, $this->senderName))
                ->to(new Address($user->getEmail()))
                ->replyTo(new Address($this->senderEmail, 'Support NOVAWIN'))
                ->subject('👋 Bienvenue sur NOVAWIN')
                ->html($this->getWelcomeEmailTemplate($user, $password))
                ->text($this->getWelcomeEmailText($user, $password));

            $this->mailer->send($email);
            return true;
        } catch (\Exception $e) {
            error_log('Erreur envoi email bienvenue: ' . $e->getMessage());
            return false;
        }
    }

    private function getVerificationEmailText(User $user, string $code, string $newEmail): string
    {
        return "
NOVAWIN - Code de vérification

Bonjour {$user->getPrenom()} {$user->getNom()},

Vous avez demandé à modifier votre adresse email vers : {$newEmail}

Votre code de vérification est : {$code}

Ce code est valable pendant 15 minutes.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

---
© 2026 NOVAWIN — Tous droits réservés.
        ";
    }

    private function getVerificationEmailTemplate(User $user, string $code, string $newEmail): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>NOVAWIN - Code de vérification</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; padding: 20px; margin: 0; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                .header { text-align: center; margin-bottom: 30px; }
                .header .logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #0b1329, #1a2744); border-radius: 16px; color: #00ffa3; font-size: 28px; font-weight: 700; margin-bottom: 12px; }
                .header h1 { color: #0b1329; font-family: 'Poppins', -apple-system, sans-serif; font-size: 26px; margin: 0; }
                .header h1 span { color: #00ffa3; }
                .header .subtitle { color: #6c757d; font-size: 14px; margin-top: 4px; }
                .greeting { font-size: 16px; color: #1a2744; margin-bottom: 16px; }
                .greeting strong { color: #0b1329; }
                .info-text { color: #495057; font-size: 15px; line-height: 1.6; margin-bottom: 20px; }
                .code-box { background: #f8f9fa; padding: 24px; text-align: center; font-size: 36px; font-weight: 700; color: #0b1329; border-radius: 12px; letter-spacing: 10px; margin: 20px 0; border: 2px dashed #e9ecef; font-family: 'Courier New', monospace; }
                .code-box .label { font-size: 12px; color: #6c757d; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 8px; font-weight: 400; }
                .warning { background: #fff8e1; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #856404; border-left: 4px solid #ffc107; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px; }
                .footer .brand { color: #0b1329; font-weight: 600; }
                @media (max-width: 480px) { .container { padding: 24px; } .code-box { font-size: 28px; letter-spacing: 6px; } }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>N</div>
                    <h1>NOVA<span>WIN</span></h1>
                    <div class='subtitle'>🔐 Code de vérification</div>
                </div>

                <div class='greeting'>Bonjour <strong>{$user->getPrenom()} {$user->getNom()}</strong>,</div>

                <div class='info-text'>
                    Vous avez demandé à modifier votre adresse email vers :<br>
                    <strong style='color: #0b1329;'>{$newEmail}</strong>
                </div>

                <div class='code-box'>
                    <span class='label'>🔑 Code de vérification</span>
                    {$code}
                </div>

                <div class='warning'>
                    ⏱️ Ce code est valable pendant <strong>15 minutes</strong>.<br>
                    Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                </div>

                <div class='footer'>
                    &copy; 2026 <span class='brand'>NOVAWIN</span> — Tous droits réservés.<br>
                    Console de Contrôle Administrative
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getEmailChangeText(User $user, string $oldEmail, string $newEmail): string
    {
        return "
NOVAWIN - Confirmation de changement d'email

Bonjour {$user->getPrenom()} {$user->getNom()},

✅ Votre adresse email a été modifiée avec succès.

Ancienne adresse : {$oldEmail}
Nouvelle adresse : {$newEmail}

Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement l'administrateur.

---
© 2026 NOVAWIN — Tous droits réservés.
        ";
    }

    private function getEmailChangeTemplate(User $user, string $oldEmail, string $newEmail): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>NOVAWIN - Confirmation</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; padding: 20px; margin: 0; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                .header { text-align: center; margin-bottom: 30px; }
                .header .logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #0b1329, #1a2744); border-radius: 16px; color: #00ffa3; font-size: 28px; font-weight: 700; margin-bottom: 12px; }
                .header h1 { color: #0b1329; font-family: 'Poppins', -apple-system, sans-serif; font-size: 26px; margin: 0; }
                .header h1 span { color: #00ffa3; }
                .greeting { font-size: 16px; color: #1a2744; margin-bottom: 16px; }
                .greeting strong { color: #0b1329; }
                .success-box { background: #d4edda; padding: 16px 20px; border-radius: 8px; color: #155724; border-left: 4px solid #28a745; margin: 20px 0; font-size: 15px; }
                .info-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; flex-wrap: wrap; }
                .info-row .label { font-weight: 600; color: #495057; width: 140px; flex-shrink: 0; }
                .info-row .value { color: #1a2744; }
                .warning { background: #fff8e1; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #856404; border-left: 4px solid #ffc107; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px; }
                .footer .brand { color: #0b1329; font-weight: 600; }
                @media (max-width: 480px) { .container { padding: 24px; } .info-row .label { width: 100%; } }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>N</div>
                    <h1>NOVA<span>WIN</span></h1>
                </div>

                <div class='greeting'>Bonjour <strong>{$user->getPrenom()} {$user->getNom()}</strong>,</div>

                <div class='success-box'>
                    ✅ <strong>Votre adresse email a été modifiée avec succès.</strong>
                </div>

                <div class='info-row'>
                    <span class='label'>📧 Ancienne adresse</span>
                    <span class='value'>{$oldEmail}</span>
                </div>
                <div class='info-row'>
                    <span class='label'>📧 Nouvelle adresse</span>
                    <span class='value'><strong style='color: #0b1329;'>{$newEmail}</strong></span>
                </div>

                <div class='warning'>
                    ⚠️ Si vous n'êtes pas à l'origine de cette modification,<br>
                    veuillez contacter immédiatement l'administrateur.
                </div>

                <div class='footer'>
                    &copy; 2026 <span class='brand'>NOVAWIN</span> — Tous droits réservés.<br>
                    Console de Contrôle Administrative
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getWelcomeEmailText(User $user, string $password): string
    {
        return "
NOVAWIN - Bienvenue !

Bonjour {$user->getPrenom()} {$user->getNom()},

Votre compte NOVAWIN a été créé avec succès.

Vos identifiants de connexion :
- Email : {$user->getEmail()}
- Mot de passe : {$password}

Pour vous connecter, rendez-vous sur : http://127.0.0.1:8000/login

Nous vous recommandons de changer votre mot de passe dès votre première connexion.

---
© 2026 NOVAWIN — Tous droits réservés.
        ";
    }

    private function getWelcomeEmailTemplate(User $user, string $password): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Bienvenue sur NOVAWIN</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; padding: 20px; margin: 0; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
                .header { text-align: center; margin-bottom: 30px; }
                .header .logo { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #0b1329, #1a2744); border-radius: 16px; color: #00ffa3; font-size: 28px; font-weight: 700; margin-bottom: 12px; }
                .header h1 { color: #0b1329; font-family: 'Poppins', -apple-system, sans-serif; font-size: 26px; margin: 0; }
                .header h1 span { color: #00ffa3; }
                .greeting { font-size: 16px; color: #1a2744; margin-bottom: 16px; }
                .greeting strong { color: #0b1329; }
                .success-box { background: #d4edda; padding: 16px 20px; border-radius: 8px; color: #155724; border-left: 4px solid #28a745; margin: 20px 0; font-size: 15px; }
                .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .info-row { padding: 8px 0; display: flex; }
                .info-row .label { font-weight: 600; color: #495057; width: 120px; flex-shrink: 0; }
                .info-row .value { color: #1a2744; font-weight: 500; }
                .btn { display: inline-block; background: linear-gradient(135deg, #0b1329, #1a2744); color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px; }
                .footer .brand { color: #0b1329; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>N</div>
                    <h1>NOVA<span>WIN</span></h1>
                </div>

                <div class='greeting'>Bonjour <strong>{$user->getPrenom()} {$user->getNom()}</strong>,</div>

                <div class='success-box'>
                    ✅ <strong>Votre compte NOVAWIN a été créé avec succès !</strong>
                </div>

                <p style='color: #495057; font-size: 15px;'>Voici vos identifiants de connexion :</p>

                <div class='info-box'>
                    <div class='info-row'>
                        <span class='label'>📧 Email</span>
                        <span class='value'>{$user->getEmail()}</span>
                    </div>
                    <div class='info-row'>
                        <span class='label'>🔑 Mot de passe</span>
                        <span class='value'><strong>{$password}</strong></span>
                    </div>
                </div>

                <div style='text-align: center;'>
                    <a href='http://127.0.0.1:8000/login' class='btn'>🔐 Se connecter</a>
                </div>

                <p style='color: #6c757d; font-size: 13px; text-align: center; margin-top: 15px;'>
                    Nous vous recommandons de changer votre mot de passe dès votre première connexion.
                </p>

                <div class='footer'>
                    &copy; 2026 <span class='brand'>NOVAWIN</span> — Tous droits réservés.<br>
                    Console de Contrôle Administrative
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
