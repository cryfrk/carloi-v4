import type { ObdExpertiseReportSummary } from '@carloi-v4/types';
import { StyleSheet, Text, View } from 'react-native';

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
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: '#ffd6c2',
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
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    color: '#d7e0e8',
    lineHeight: 21,
  },
  scorePill: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(239,131,84,0.16)',
  },
  scoreValue: {
    color: '#f8f2ea',
    fontSize: 28,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#9cb0be',
    fontSize: 12,
  },
  listBlock: {
    gap: 8,
  },
  blockTitle: {
    color: '#f8f2ea',
    fontSize: 15,
    fontWeight: '800',
  },
  bulletText: {
    color: '#d7e0e8',
    lineHeight: 20,
  },
  faultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#102030',
  },
  faultCode: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  faultDescription: {
    color: '#9cb0be',
    marginTop: 3,
  },
  faultSeverity: {
    color: '#ffd6c2',
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
    borderRadius: 18,
    backgroundColor: '#102030',
  },
  metricLabel: {
    color: '#8fa4b4',
    fontSize: 12,
  },
  metricValue: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  disclaimer: {
    color: '#8fa4b4',
    fontSize: 12,
    lineHeight: 18,
  },
});
