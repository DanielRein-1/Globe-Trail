
import { ApiProvider } from '@prisma/client';
import { db as prisma } from '@/lib/db/prisma';

export const logApiRequest = async (
  provider: ApiProvider,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string
) => {
  try {
    await prisma.apiRequestLog.create({
      data: {
        provider,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        success,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log API request:', error);
    // We don't want to throw an error here and interrupt the main flow,
    // so we just log the failure to the console.
  }
};
