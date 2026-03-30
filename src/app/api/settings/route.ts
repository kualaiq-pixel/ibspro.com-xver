import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        language: true,
        currency: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get company data
    const companyUser = await db.companyUser.findFirst({
      where: { userId },
      include: { company: true },
    });

    const company = companyUser?.company || null;

    return NextResponse.json({ user, company });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profile, company: companyData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Update user profile
    if (profile) {
      const profileData: Record<string, unknown> = {};
      if (profile.name !== undefined) profileData.name = profile.name;
      if (profile.email !== undefined) profileData.email = profile.email;
      if (profile.phone !== undefined) profileData.phone = profile.phone;
      if (profile.avatar !== undefined) profileData.avatar = profile.avatar;
      if (profile.language !== undefined) profileData.language = profile.language;
      if (profile.currency !== undefined) profileData.currency = profile.currency;

      await db.user.update({
        where: { id: userId },
        data: profileData,
      });
    }

    // Update company info
    if (companyData?.companyId) {
      const companyUpdate: Record<string, unknown> = {};
      if (companyData.name !== undefined) companyUpdate.name = companyData.name;
      if (companyData.email !== undefined) companyUpdate.email = companyData.email;
      if (companyData.phone !== undefined) companyUpdate.phone = companyData.phone;
      if (companyData.address !== undefined) companyUpdate.address = companyData.address;
      if (companyData.city !== undefined) companyUpdate.city = companyData.city;
      if (companyData.country !== undefined) companyUpdate.country = companyData.country;
      if (companyData.postalCode !== undefined) companyUpdate.postalCode = companyData.postalCode;
      if (companyData.vatNumber !== undefined) companyUpdate.vatNumber = companyData.vatNumber;
      if (companyData.website !== undefined) companyUpdate.website = companyData.website;
      if (companyData.logo !== undefined) companyUpdate.logo = companyData.logo;

      await db.company.update({
        where: { id: companyData.companyId },
        data: companyUpdate,
      });
    }

    // Fetch updated data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, avatar: true, language: true, currency: true },
    });

    const companyUser = await db.companyUser.findFirst({
      where: { userId },
      include: { company: true },
    });

    const company = companyUser?.company || null;

    return NextResponse.json({ user, company });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
