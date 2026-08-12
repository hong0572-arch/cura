import React, { useState } from 'react';
import { 
  PlaneLanding, PlaneTakeoff, RefreshCw, 
  MapPin, Compass, FileCheck, Briefcase, 
  ShieldAlert, Car, Mail, Ticket, ShoppingBag, 
  Bell, Plane, CalendarClock, UserCheck, BaggageClaim, Shield, ChevronRight, CheckCircle2
} from 'lucide-react';

export default function Services({ t }) {
  const services = [
    {
      id: 'arrival',
      title: t.services.arrival.title,
      desc: t.services.arrival.desc,
      bg: '/vip_arrival_escort_v3.jpg'
    },
    {
      id: 'departure',
      title: t.services.departure.title,
      desc: t.services.departure.desc,
      bg: '/vip_departure_escort.jpg'
    },
    {
      id: 'transfer',
      title: t.services.transfer.title,
      desc: t.services.transfer.desc,
      bg: '/vip_arrival_escort.jpg'
    }
  ];

  const handleScrollToProcess = (id) => {
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
        <div className="section-header">
          <span className="badge-gold">{t.services.badge || 'Meet & Assist'}</span>
          <h2 className="font-serif">{t.services.title}</h2>
          <p>{t.services.subtitle}</p>
        </div>

        {/* Services Grid (Image Cards) */}
        <div className="grid-3">
          {services.map((svc) => (
            <div 
              key={svc.id}
              className="image-card"
              style={{ backgroundImage: `url(${svc.bg})`, cursor: 'pointer' }}
              onClick={() => handleScrollToProcess(svc.id)}
            >
              <div className="image-card-overlay"></div>
              <div className="image-card-content">
                <h3 className="image-card-title">{svc.title}</h3>
                <p className="image-card-desc">{svc.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* --- Process Diagram Section --- */}
        <div className="process-diagram-container" style={{ marginTop: '80px' }}>
          
          {/* Arrival Process */}
          <div id="process-arrival" className="process-wrapper glass-panel">
            <div className="process-header">
              <span className="process-badge">ARRIVAL SERVICE</span>
              <h3>입국 에스코트 서비스 과정</h3>
              <p>도착 항공기 브릿지에서부터 심사·수하물·통관·차량 탑승까지 전 구간을 동행합니다.<br/>
              장시간 비행으로 피로한 고객의 복잡한 입국 절차를 전담 에스코트가 대신 처리하여, 고객이 여유롭게 다음 일정으로 이동할 수 있도록 지원합니다.</p>
            </div>
            
            <div className="process-flow">
              <div className="process-step">
                <div className="process-icon-circle"><PlaneLanding size={32} strokeWidth={1.5} /></div>
                <h4>에어브릿지 영접</h4>
                <span>항공기 도착 시 맞이</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><UserCheck size={32} strokeWidth={1.5} /></div>
                <h4>입국심사 동행</h4>
                <span>심사대까지 에스코트</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><BaggageClaim size={32} strokeWidth={1.5} /></div>
                <h4>수하물 수령</h4>
                <span>빠른 수하물 안내</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><FileCheck size={32} strokeWidth={1.5} /></div>
                <h4>세관 통관</h4>
                <span>통관 절차 대행</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><Car size={32} strokeWidth={1.5} /></div>
                <h4>VIP 주차장 이동</h4>
                <span>전용 주차장으로 안내</span>
              </div>
            </div>
            
            <div className="process-footer">
              <p>각 단계에서 발생할 수 있는 지연과 불편을 사전에 예방하며, 고객이 여유롭고 품격 있는 입국 경험을 누릴 수 있도록 지원합니다.</p>
            </div>
          </div>

          {/* Departure Process */}
          <div id="process-departure" className="process-wrapper glass-panel" style={{ marginTop: '60px' }}>
            <div className="process-header">
              <span className="process-badge">DEPARTURE SERVICE</span>
              <h3>출국 에스코트 서비스 과정</h3>
              <p>공항 도착 순간부터 최종 탑승 확인까지, 전담 에스코트가 모든 절차를 동행합니다.<br/>
              사전에 항공편 정보와 고객 선호도를 파악하여 가장 효율적이고 편안한 동선을 설계합니다.</p>
            </div>
            
            <div className="process-flow">
              <div className="process-step">
                <div className="process-icon-circle"><MapPin size={32} strokeWidth={1.5} /></div>
                <h4>공항도착장소 영접</h4>
                <span>전용 하차 구역 안내</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><Ticket size={32} strokeWidth={1.5} /></div>
                <h4>항공사 체크인</h4>
                <span>신속한 발권 지원</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><Shield size={32} strokeWidth={1.5} /></div>
                <h4>보안지원</h4>
                <span>Fast Track 등 안내</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><Compass size={32} strokeWidth={1.5} /></div>
                <h4>출국동행</h4>
                <span>출국심사/환전/라운지 이동</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><CheckCircle2 size={32} strokeWidth={1.5} /></div>
                <h4>게이트 이동 탑승확인</h4>
                <span>최종 탑승 에스코트</span>
              </div>
            </div>
            
            <div className="process-footer">
              <p>각 단계에서 발생할 수 있는 지연과 불편을 사전에 예방하며, 고객이 여유롭고 품격 있는 출국 경험을 누릴 수 있도록 지원합니다.</p>
            </div>
          </div>

          {/* Transfer Process */}
          <div id="process-transfer" className="process-wrapper glass-panel" style={{ marginTop: '60px' }}>
            <div className="process-header">
              <span className="process-badge">TRANSFER SERVICE</span>
              <h3>환승 의전 서비스 프로세스</h3>
              <p>서로 다른 항공편 사이의 가장 부드럽고 지체 없는 환승 안내 서비스</p>
            </div>
            
            <div className="process-flow">
              <div className="process-step">
                <div className="process-icon-circle"><CalendarClock size={32} strokeWidth={1.5} /></div>
                <h4>사전 준비 (Pre-Arrival)</h4>
                <span>최적의 환승 경로 계획</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><MapPin size={32} strokeWidth={1.5} /></div>
                <h4>도착 게이트 영접</h4>
                <span>성함 피켓 마중 및 안내</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><RefreshCw size={32} strokeWidth={1.5} /></div>
                <h4>원스톱 환승 지원</h4>
                <span>환승 터미널 이동/에스코트</span>
              </div>
              <ChevronRight className="process-arrow" />
              <div className="process-step">
                <div className="process-icon-circle"><PlaneTakeoff size={32} strokeWidth={1.5} /></div>
                <h4>탑승 인도 및 종료</h4>
                <span>최종 탑승 확인 및 배웅</span>
              </div>
            </div>
            
            <div className="process-footer">
              <p>고객님의 도착 및 출발 항공편 정보를 면밀히 확인하여, 공항 내 가장 효율적인 동선으로 다음 출발 게이트까지 안전하게 모십니다.</p>
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
