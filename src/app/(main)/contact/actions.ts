'use server';

import { z } from 'zod';
import { Resend } from 'resend';

const contactSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

interface FormState {
    message: string;
    errors?: Record<string, string[] | undefined>;
}

export async function sendEmail(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set.');
    return { message: 'Server configuration error. Could not send email.', errors: {} };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { name, email, subject, message } = validatedFields.data;

  try {
    await resend.emails.send({
      from: 'DevCollab Hub <onboarding@resend.dev>', // Must be a verified domain on Resend
      to: 'dennis_chomba@outlook.com',
      subject: `DevCollab Hub Contact: ${subject}`,
      reply_to: email,
      html: `
        <h1>New message from DevCollab Hub Contact Form</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    return { message: 'Your message has been sent successfully!' };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { message: 'An unknown error occurred while sending the email.', errors: {} };
  }
}
