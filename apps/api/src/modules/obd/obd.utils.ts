import { ObdFaultSeverity, ObdReportStatus, Prisma } from '@prisma/client';

const toStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const toPlainObject = (value: Prisma.JsonValue | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export function serializeObdReport(
  report:
    | ({
        id: string;
        reportStatus: ObdReportStatus;
        overallScore: number | null;
        summaryText: string | null;
        criticalIssues: Prisma.JsonValue | null;
        warnings: Prisma.JsonValue | null;
        normalFindings: Prisma.JsonValue | null;
        rawMetricsSummary: Prisma.JsonValue | null;
        durationSeconds: number | null;
        reportedAt: Date | null;
        createdAt: Date;
        faultCodes: Array<{
          code?: string;
          faultCode?: string;
          description: string | null;
          severity: ObdFaultSeverity | string;
        }>;
      } & Record<string, unknown>)
    | null
    | undefined,
) {
  if (!report) {
    return null;
  }

  return {
    id: report.id,
    reportStatus: report.reportStatus,
    overallScore: report.overallScore,
    summary: report.summaryText,
    criticalIssues: toStringArray(report.criticalIssues),
    warnings: toStringArray(report.warnings),
    normalFindings: toStringArray(report.normalFindings),
    faultCodes: report.faultCodes.map((faultCode) => ({
      code: faultCode.code ?? faultCode.faultCode ?? '',
      description: faultCode.description,
      severity: faultCode.severity,
    })),
    rawMetricsSummary: toPlainObject(report.rawMetricsSummary),
    durationSeconds: report.durationSeconds,
    reportedAt: report.reportedAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
  };
}
