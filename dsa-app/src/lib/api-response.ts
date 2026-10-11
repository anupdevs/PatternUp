import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError, ForbiddenError } from './auth';

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function handleApiError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 403 }
    );
  }

  if (error instanceof Error) {
    const errorName = error.name || error.constructor?.name || '';
    const message = error.message.toLowerCase();

    // Prevent leaking internal database connection or Prisma engine details
    if (
      errorName.startsWith('Prisma') ||
      message.includes('prisma') ||
      message.includes('postgresql://') ||
      message.includes('connect to the database') ||
      message.includes('neon.tech')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'A database error occurred. Please verify your connection and try again.'
        },
        { status: 500 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected internal server error occurred.'
    },
    { status: 500 }
  );
}
