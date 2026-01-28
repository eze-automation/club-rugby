'use server';

import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function getMemberByDNI(dni: string) {
    const cleanDNI = dni.replace(/\./g, '').trim();

    const member = await prisma.member.findUnique({
        where: { dni: cleanDNI },
        include: {
            payments: {
                orderBy: { createdAt: 'desc' },
                take: 5,
            },
        },
    });

    return member;
}

export async function uploadPayment(formData: FormData) {
    const dni = formData.get('dni') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const file = formData.get('receipt') as File;

    if (!dni || !amount || !file) {
        return { success: false, error: 'Faltan datos requeridos' };
    }

    const cleanDNI = dni.replace(/\./g, '').trim();
    const member = await prisma.member.findUnique({ where: { dni: cleanDNI } });

    if (!member) {
        return { success: false, error: 'Socio no encontrado' };
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Create payment record
    await prisma.payment.create({
        data: {
            memberId: member.id,
            amount,
            receiptUrl: `/uploads/${fileName}`,
            status: 'PENDING',
        },
    });

    return { success: true, message: 'Comprobante enviado correctamente' };
}
