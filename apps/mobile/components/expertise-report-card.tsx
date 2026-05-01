import type { ObdExpertiseReportSummary } from '@carloi-v4/types';
import { StyleSheet, Text, View } from 'react-native';
import { mobileTheme } from '../lib/design-system';

type ExpertiseReportCardProps = {
  report: ObdExpertiseReportSummary | null;
  vehicleLabel?: string;
};

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.listBlock}>
      <Text style={styles.blockTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={`${title}-${item}`} style={styles.bulletText}>
          - {item}
        </Text>
      ))}
    </View>
  );
}

export function ExpertiseReportCard({ report, vehicleLabel }: ExpertiseReportCardProps) {
  if (!report) {
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>Carloi Expertiz</Text>
        <Text style={styles.title}>Rapor henuz olusturulmadi</Text>
        <Text style={styles.copy}>
          Araciniz icin mock OBD testi baslatildiginda skor, hata kodlari ve metrik ozeti burada gorunur.
        </Text>
      </View>
    );
  }

  const metrics = report.rawMetricsSummary;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>CARLOI EXPERTIZ RAPORU</Text>
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>{vehicleLabel ?? 'Arac raporu'}</Text>
          <Text style={styles.copy}>{report.summary ?? 'Ozet bilgisi olusturulamadi.'}</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreValue}>{report.overallScore ?? '--'}</Text>
          <Text style={styles.scoreLabel}>Skor / 100</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Durum: {report.reportStatus}</Text>
        <Text style={styles.metaText}>
          Tarih: {new Date(report.reportedAt ?? report.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>

      <BulletList title="Kritik uyarilar" items={report.criticalIssues} />
      <BulletList title="Dikkat edilmesi gerekenler" items={report.warnings} />
      <BulletList title="Normal bulgular" items={report.normalFindings} />

      {report.faultCodes.length > 0 ? (
        <View style={styles.listBlock}>
          <Text style={styles.blockTitle}>Hata kodlari</Text>
          {report.faultCodes.map((faultCode) => (
            <View key={faultCode.code} style={styles.faultRow}>
              <View>
                <Text style={styles.faultCode}>{faultCode.code}</Text>
                <Text style={styles.faultDescription}>{faultCode.description ?? 'Aciklama yok'}</Text>
              </View>
              <Text style={styles.faultSeverity}>{faultCode.severity}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {metrics ? (
        <View style={styles.metricsGrid}>
          <MetricTile label="Ortalama RPM" value={String(metrics.averageRpm)} />
          <MetricTile label="Maks hiz" value={`${metrics.maxSpeed} km/h`} />
          <MetricTile label="Ortalama motor sicakligi" value={`${metrics.averageCoolantTemp} C`} />
          <MetricTile label="Min aku voltaji" value={`${metrics.minBatteryVoltage} V`} />
          <MetricTile label="Ortalama yakit" value={`${metrics.averageFuelLevel}%`} />
          <MetricTile label="Ortalama motor yuku" value={`${metrics.averageEngineLoad}%`} />
        </View>
      ) : null}

      <Text style={styles.disclaimer}>
        Bu rapor OBD verileri ve kullanici tarafindan girilen arac bilgilerine gore hazirlanmistir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  kicker: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 21,
  },
  scorePill: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: mobileTheme.radius.lg,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  scoreValue: {
    color: mobileTheme.colors.textStrong,
    fontSize: 28,
    fontWeight: '900',
  },
  scoreLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  listBlock: {
    gap: 8,
  },
  blockTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 15,
    fontWeight: '800',
  },
  bulletText: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  faultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  faultCode: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
  },
  faultDescription: {
    color: mobileTheme.colors.textMuted,
    marginTop: 3,
  },
  faultSeverity: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    width: '48%',
    minWidth: 140,
    gap: 4,
    padding: 12,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  metricLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  metricValue: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
  },
  disclaimer: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
