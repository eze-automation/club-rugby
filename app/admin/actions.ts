'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_COOKIE = 'admin_session';

export async function loginAdmin(password: string) {
    if (password === ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        cookieStore.set(ADMIN_COOKIE, 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
        });
        return { success: true };
    }
    return { success: false, error: 'Contraseña incorrecta' };
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_COOKIE);
    return { success: true };
}

export async function isAdminAuthenticated() {
    const cookieStore = await cookies();
    return cookieStore.get(ADMIN_COOKIE)?.value === 'authenticated';
}

export async function getMembers() {
    const members = await prisma.member.findMany({
        orderBy: { name: 'asc' },
        include: {
            payments: {
                orderBy: { createdAt: 'desc' },
                take: 3,
            },
        },
    });
    // Serialize Decimal to number for client components
    return members.map(m => ({
        ...m,
        debt: Number(m.debt),
        payments: m.payments.map(p => ({ ...p, amount: Number(p.amount) })),
    }));
}

export async function getPendingPayments() {
    const payments = await prisma.payment.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
            member: true,
        },
    });
    // Serialize Decimal to number for client components
    return payments.map(p => ({
        ...p,
        amount: Number(p.amount),
        member: { ...p.member, debt: Number(p.member.debt) },
    }));
}

export async function approvePayment(paymentId: number) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return { success: false, error: 'Pago no encontrado' };

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'APPROVED' },
        }),
        prisma.member.update({
            where: { id: payment.memberId },
            data: {
                debt: {
                    decrement: payment.amount,
                },
            },
        }),
    ]);

    return { success: true };
}

export async function rejectPayment(paymentId: number) {
    await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED' },
    });
    return { success: true };
}

export async function updateMemberDebt(memberId: number, newDebt: number) {
    await prisma.member.update({
        where: { id: memberId },
        data: { debt: newDebt },
    });
    return { success: true };
}

export async function updateMember(memberId: number, data: {
    name: string;
    email?: string;
    phone?: string;
    category: string;
    debt: number;
}) {
    await prisma.member.update({
        where: { id: memberId },
        data: {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            category: data.category as never,
            debt: data.debt,
        },
    });
    return { success: true };
}

export async function createMember(data: {
    dni: string;
    name: string;
    email?: string;
    phone?: string;
    category: string;
    debt: number;
}) {
    const cleanDNI = data.dni.replace(/\./g, '').trim();

    // Check if DNI already exists
    const existing = await prisma.member.findUnique({ where: { dni: cleanDNI } });
    if (existing) {
        return { success: false, error: 'Ya existe un socio con ese DNI' };
    }

    await prisma.member.create({
        data: {
            dni: cleanDNI,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            category: data.category as never,
            debt: data.debt,
        },
    });

    return { success: true };
}

export async function deleteMember(memberId: number) {
    try {
        await prisma.member.delete({ where: { id: memberId } });
        return { success: true };
    } catch {
        return { success: false, error: 'No se pudo eliminar el socio' };
    }
}

export async function applyMonthlyFee(feeAmount: number) {
    try {
        // Get all active members and add the fee to their debt
        const members = await prisma.member.findMany({ where: { active: true } });

        for (const member of members) {
            await prisma.member.update({
                where: { id: member.id },
                data: { debt: { increment: feeAmount } },
            });
        }

        return { success: true, count: members.length };
    } catch {
        return { success: false, error: 'Error al aplicar la cuota mensual' };
    }
}

export async function getStats() {
    const [totalMembers, totalDebt, pendingPayments] = await Promise.all([
        prisma.member.count(),
        prisma.member.aggregate({ _sum: { debt: true } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
    ]);

    return {
        totalMembers,
        totalDebt: Number(totalDebt._sum.debt || 0),
        pendingPayments,
    };
}
