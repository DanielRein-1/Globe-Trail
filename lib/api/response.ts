
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

const sanitizeForSerialization = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj; // Let JSON.stringify handle Date objects
  }

  if (typeof obj === 'bigint' || obj instanceof Prisma.Decimal) {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForSerialization);
  }

  if (typeof obj === 'object') {
    const newObj: Record<string, unknown> = {};
    const entries: [string, unknown][] = Object.entries(obj);
    for (const [key, value] of entries) {
      newObj[key] = sanitizeForSerialization(value);
    }
    return newObj;
  }

  return obj;
};

export const createSuccessResponse = (data: unknown, status = 200) => {
  const sanitizedData = sanitizeForSerialization(data);
  return NextResponse.json(
    {
      success: true,
      version: 'v1',
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      data: sanitizedData,
    },
    { status }
  );
};

export const createErrorResponse = (message: string, code: string, status = 500) => {
  return NextResponse.json(
    {
      success: false,
      version: 'v1',
      requestId: randomUUID(),
      error: {
        code,
        message,
      },
    },
    { status }
  );
};
