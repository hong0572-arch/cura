import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import ServiceJourney from './home/ServiceJourney';

export default function Services({ t, lang = 'ko' }) {
  const services = [
    {
      id: 'arrival',
      title: t.services.arrival.title,
      desc: t.services.arrival.desc,
      bg: '/vip_arrival_escort_v3.webp'
    },
    {
      id: 'departure',
      title: t.services.departure.title,
      desc: t.services.departure.desc,
      chip: t.services.diagrams?.departure?.taxRefund?.chip,
      bg: '/vip_departure_escort.webp'
    },
    {
      id: 'transfer',
      title: t.services.transfer.title,
      desc: t.services.transfer.desc,
      bg: '/vip_arrival_escort.webp'
    }
  ];

  // 단계 문구는 번역(관리자 화면에서 편집 가능)을 그대로 쓰고, 출국에는 택스리펀드 단계를 끼워 넣는다
  const D = t.services.diagrams || {};
  const pick = (list, fallback) => (Array.isArray(list) && list.length ? list : fallback).map(x => ({ title: x?.title || '', desc: x?.desc || '' }));
  const departureBase = pick(D.departure?.steps, [
    { title: '공항도착장소 영접', desc: '전용 하차 구역 안내' }, { title: '항공사 체크인', desc: '신속한 발권 지원' },
    { title: '보안지원', desc: 'Fast Track 등 안내' }, { title: '출국동행', desc: '출국심사/환전/라운지 이동' },
    { title: '게이트 이동 탑승확인', desc: '최종 탑승 에스코트' },
  ]).slice(0, 5);
  const journeySteps = {
    arrival: pick(D.arrival?.steps, [
      { title: '에어브릿지 영접', desc: '항공기 도착 시 맞이' }, { title: '입국심사 동행', desc: '심사대까지 에스코트' },
      { title: '수하물 수령', desc: '빠른 수하물 안내' }, { title: '세관 통관', desc: '통관 절차 대행' },
      { title: 'VIP 주차장 이동', desc: '전용 주차장으로 안내' },
    ]).slice(0, 5),
    departure: D.departure?.taxRefund
      ? [...departureBase.slice(0, 2), { title: D.departure.taxRefund.title, desc: D.departure.taxRefund.desc }, ...departureBase.slice(2)]
      : departureBase,
    transfer: pick(D.transfer?.steps, [
      { title: '사전 준비 (Pre-Arrival)', desc: '최적의 환승 경로 계획' }, { title: '도착 게이트 영접', desc: '성함 피켓 마중 및 안내' },
      { title: '원스톱 환승 지원', desc: '환승 터미널 이동/에스코트' }, { title: '탑승 인도 및 종료', desc: '최종 탑승 확인 및 배웅' },
    ]).slice(0, 4),
  };

  // 입국·출국·환승 과정 중 하나만 보여 준다 (나머지도 HTML에는 남아 검색엔진이 읽을 수 있음)
  const [active, setActive] = useState('arrival');

  const handleScrollToProcess = (id) => {
    setActive(id);
    const element = document.getElementById(`process-${id}`);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="services" className="services-section section-padding">
      <div className="container">
        {/* 제목 영역: 꼬리표는 '·'로 구분, 설명은 첫 문장을 리드로 크게, 나머지는 한 단락으로 (문장마다 줄을 끊지 않는다) */}
        <div className="section-header svc-head">
          <span className="badge-gold">{String(t.services.badge || 'Meet & Assist').split(/\s*,\s*/).filter(Boolean).join(' · ')}</span>
          <h2 className="font-serif">{t.services.title}</h2>
          {(() => {
            const text = typeof t.services.subtitle === 'string' ? t.services.subtitle.replace(/\s+/g, ' ').trim() : '';
            if (!text) return null;
            const cut = text.search(/[.!?。](\s|$)/);
            const lead = cut > 0 ? text.slice(0, cut + 1) : text;
            const rest = cut > 0 ? text.slice(cut + 1).trim() : '';
            return (
              <>
                <p className="svc-lead">{lead}</p>
                {rest && <p className="svc-sub">{rest}</p>}
              </>
            );
          })()}
        </div>

        {/* Services Grid (Image Cards) */}
        <div className="grid-3">
          {services.map((svc) => (
            <button
              type="button"
              key={svc.id}
              className={`image-card svc-tab ${active === svc.id ? 'is-active' : ''}`}
              aria-pressed={active === svc.id}
              aria-controls={`process-${svc.id}`}
              style={{ backgroundImage: `url(${svc.bg})` }}
              onClick={() => handleScrollToProcess(svc.id)}
            >
              <div className="image-card-overlay"></div>
              <div className="image-card-content">
                {svc.chip && <span className="svc-chip">{svc.chip}</span>}
                <h3 className="image-card-title">{svc.title}</h3>
                <p className="image-card-desc">{svc.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* --- Process Diagram Section --- */}
        <div className="process-diagram-container" style={{ marginTop: '40px' }}>

          {/* Arrival Process */}
          <div id="process-arrival" className="process-wrapper glass-panel" hidden={active !== 'arrival'}>
            <div className="process-header">
              <span className="process-badge">{t.services.diagrams?.arrival?.badge || 'ARRIVAL SERVICE'}</span>
              <h3>{t.services.diagrams?.arrival?.title || '입국 에스코트 서비스 과정'}</h3>
              <p>
                {t.services.diagrams?.arrival?.desc?.split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}<br/></React.Fragment>
                ))}
              </p>
            </div>

            <ServiceJourney kind="arrival" steps={journeySteps.arrival} lang={lang} active={active === 'arrival'} />

            <div className="process-footer">
              <p>{t.services.diagrams?.arrival?.footer || '각 단계에서 발생할 수 있는 지연과 불편을 사전에 예방하며, 고객이 여유롭고 품격 있는 입국 경험을 누릴 수 있도록 지원합니다.'}</p>
            </div>
          </div>

          {/* Departure Process */}
          <div id="process-departure" className="process-wrapper glass-panel" hidden={active !== 'departure'}>
            <div className="process-header">
              <span className="process-badge">{t.services.diagrams?.departure?.badge || 'DEPARTURE SERVICE'}</span>
              <h3>{t.services.diagrams?.departure?.title || '출국 에스코트 서비스 과정'}</h3>
              <p>
                {t.services.diagrams?.departure?.desc?.split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}<br/></React.Fragment>
                ))}
              </p>
            </div>

            <ServiceJourney kind="departure" steps={journeySteps.departure} lang={lang} active={active === 'departure'} />

            <div className="process-footer">
              <p>{t.services.diagrams?.departure?.footer || '각 단계에서 발생할 수 있는 지연과 불편을 사전에 예방하며, 고객이 여유롭고 품격 있는 출국 경험을 누릴 수 있도록 지원합니다.'}</p>
              {t.services.diagrams?.departure?.taxRefund?.note && (
                <p className="process-note"><Receipt size={16} aria-hidden="true" /> {t.services.diagrams.departure.taxRefund.note}</p>
              )}
            </div>
          </div>

          {/* Transfer Process */}
          <div id="process-transfer" className="process-wrapper glass-panel" hidden={active !== 'transfer'}>
            <div className="process-header">
              <span className="process-badge">{t.services.diagrams?.transfer?.badge || 'TRANSFER SERVICE'}</span>
              <h3>{t.services.diagrams?.transfer?.title || '환승 의전 서비스 프로세스'}</h3>
              <p>{t.services.diagrams?.transfer?.desc || '서로 다른 항공편 사이의 가장 부드럽고 지체 없는 환승 안내 서비스'}</p>
            </div>

            <ServiceJourney kind="transfer" steps={journeySteps.transfer} lang={lang} active={active === 'transfer'} />

            <div className="process-footer">
              <p>{t.services.diagrams?.transfer?.footer || '고객님의 도착 및 출발 항공편 정보를 면밀히 확인하여, 공항 내 가장 효율적인 동선으로 다음 출발 게이트까지 안전하게 모십니다.'}</p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .services-section {
          background: transparent;
          position: relative;
        }
      `}</style>
    </section>
  );
}
