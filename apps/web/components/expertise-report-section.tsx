'use client';

import type { ObdExpertiseReportSummary } from '@carloi-v4/types';

type ExpertiseReportSectionProps = {
  report: ObdExpertiseReportSummary | null;
  vehicleLabel?: string;
};

function ReportList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="expertise-block">
      <div className="card-label">{title}</div>
      <div className="expertise-list">
        {items.map((item) => (
          <p key={`${title}-${item}`}>{item}</p>
        ))}
      </div>
    </div>
  );
}

export function ExpertiseReportSection({ report, vehicleLabel }: ExpertiseReportSectionProps) {
  if (!report) {
    return (
      <article className="detail-card expertise-card">
        <div className="card-label">CARLOI EXPERTIZ RAPORU</div>
        <h3 className="card-title">Rapor henuz olusturulmadi</h3>
        <p className="card-copy">
          Garajdan mock OBD testi baslatildiginda skor, hata kodlari ve metrik ozeti bu alanda gosterilir.
        </p>
      </article>
    );
  }

  const metrics = report.rawMetricsSummary;

  return (
    <article className="detail-card expertise-card">
      <div className="expertise-head">
        <div>
          <div className="card-label">CARLOI EXPERTIZ RAPORU</div>
          <h3 className="card-title">{vehicleLabel ?? 'Arac raporu'}</h3>
          <p className="card-copy">{report.summary ?? 'Ozet bilgisi olusturulamadi.'}</p>
        </div>
        <div className="expertise-score-pill">
          <strong>{report.overallScore ?? '--'}</strong>
          <span>Skor / 100</span>
        </div>
      </div>

      <div className="listing-meta-inline">
        <span>Durum: {report.reportStatus}</span>
        <span>Tarih: {new Date(report.reportedAt ?? report.createdAt).toLocaleDateString('tr-TR')}</span>
      </div>

      <ReportList title="Kritik uyarilar" items={report.criticalIssues} />
      <ReportList title="Dikkat edilmesi gerekenler" items={report.warnings} />
      <ReportList title="Normal bulgular" items={report.normalFindings} />

      {report.faultCodes.length > 0 ? (
        <div className="expertise-block">
          <div className="card-label">Hata kodlari</div>
          <div className="expertise-fault-list">
            {report.faultCodes.map((faultCode) => (
              <div className="expertise-fault-card" key={faultCode.code}>
                <div>
                  <strong>{faultCode.code}</strong>
                  <p>{faultCode.description ?? 'Aciklama yok'}</p>
                </div>
                <span>{faultCode.severity}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {metrics ? (
        <div className="expertise-metrics-grid">
          <div className="listing-info-row">
            <span>Ortalama RPM</span>
            <strong>{metrics.averageRpm}</strong>
          </div>
          <div className="listing-info-row">
            <span>Maks hiz</span>
            <strong>{metrics.maxSpeed} km/h</strong>
          </div>
          <div className="listing-info-row">
            <span>Ort. sicaklik</span>
            <strong>{metrics.averageCoolantTemp} C</strong>
          </div>
          <div className="listing-info-row">
            <span>Min aku voltaji</span>
            <strong>{metrics.minBatteryVoltage} V</strong>
          </div>
          <div className="listing-info-row">
            <span>Ort. yakit seviyesi</span>
            <strong>{metrics.averageFuelLevel}%</strong>
          </div>
          <div className="listing-info-row">
            <span>Ort. motor yuku</span>
            <strong>{metrics.averageEngineLoad}%</strong>
          </div>
        </div>
      ) : null}

      <p className="expertise-disclaimer">
        Bu rapor OBD verileri ve kullanici tarafindan girilen arac bilgilerine gore hazirlanmistir.
      </p>
    </article>
  );
}
