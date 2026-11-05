// HTML에서 주요 DOM 요소를 선택해 변수에 저장합니다
const sidoSelect = document.getElementById('sido-select');
const selectedSidoEl = document.getElementById('selected-sido');
const trafficHeroEl = document.getElementById('traffic-hero');
const trafficEmojiEl = document.getElementById('traffic-emoji');
const trafficStatusTextEl = document.getElementById('traffic-status-text');
const avgPm10El = document.getElementById('avg-pm10');
const trafficActionTipEl = document.getElementById('traffic-action-tip');
const baseTimeDisplayEl = document.getElementById('base-time-display');
const statusMessageEl = document.getElementById('status-message');
const cardGridEl = document.getElementById('card-grid');
const dustChartCanvas = document.getElementById('dust-chart');

// Chart.js 인스턴스를 보관할 변수입니다
let dustChartInstance = null;

// 등급별 메타데이터(이모지, 텍스트, 색상 코드, 클래스명)를 반환하는 함수입니다
function getGradeMeta(grade) {
  if (grade === '1') {
    return {
      emoji: '🔵',
      text: '좋음',
      className: 'grade-1',
      barColor: '#3b82f6', // 파랑
      borderColor: '#2563eb'
    };
  }
  if (grade === '2') {
    return {
      emoji: '🟢',
      text: '보통',
      className: 'grade-2',
      barColor: '#22c55e', // 초록
      borderColor: '#16a34a'
    };
  }
  if (grade === '3') {
    return {
      emoji: '🟠',
      text: '나쁨',
      className: 'grade-3',
      barColor: '#f97316', // 주황
      borderColor: '#ea580c'
    };
  }
  if (grade === '4') {
    return {
      emoji: '🔴',
      text: '매우나쁨',
      className: 'grade-4',
      barColor: '#ef4444', // 빨강
      borderColor: '#dc2626'
    };
  }
  return {
    emoji: '⚪',
    text: '정보없음',
    className: 'grade-none',
    barColor: '#94a3b8', // 회색
    borderColor: '#64748b'
  };
}

// 미세먼지 수치에 따라 환경부 기준 4단계 등급을 판정하는 함수입니다
function getGradeByPm10Value(value) {
  if (value === null || Number.isNaN(value)) return 'none';
  if (value <= 30) return '1'; // 0 ~ 30: 좋음
  if (value <= 80) return '2'; // 31 ~ 80: 보통
  if (value <= 150) return '3'; // 81 ~ 150: 나쁨
  return '4'; // 151 이상: 매우나쁨
}

// 측정 시각 문자열을 '2026년 10월 28일 16시 기준' 형태로 변환하는 함수입니다
function formatKoreanDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '측정 시각 정보 없음';
  
  const parts = dateStr.trim().split(' ');
  if (parts.length >= 2) {
    const [year, month, day] = parts[0].split('-');
    const [hour] = parts[1].split(':');
    if (year && month && day && hour !== undefined) {
      return `${parseInt(year, 10)}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일 ${parseInt(hour, 10)}시 기준`;
    }
  }
  return `${dateStr} 기준`;
}

// 측정값이 비어 있거나 '-'일 때 처리하는 함수입니다
function formatMeasureValue(value) {
  if (!value || value === '-') return '측정 안 됨';
  return `${value} ㎍/㎥`;
}

// 측정소 목록에서 유효한 pm10 수치들의 평균값(숫자)을 계산하는 함수입니다
function calculateAveragePm10Number(items) {
  let sum = 0;
  let count = 0;

  items.forEach((item) => {
    const raw = item.pm10Value;
    if (raw && raw !== '-') {
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        sum += num;
        count += 1;
      }
    }
  });

  if (count === 0) return null;
  return Math.round(sum / count);
}

// 신호등 대형 요약 배너의 내용과 스타일을 업데이트하는 함수입니다
function updateTrafficHero(items) {
  if (!items || items.length === 0) {
    trafficHeroEl.className = 'traffic-hero grade-none';
    trafficEmojiEl.textContent = '⚪';
    trafficStatusTextEl.textContent = '데이터 없음';
    avgPm10El.textContent = '측정 안 됨';
    trafficActionTipEl.textContent = '측정소 정보를 불러올 수 없습니다.';
    baseTimeDisplayEl.textContent = '기준 시각 정보 없음';
    return;
  }

  const sampleTime = items.find((i) => i.dataTime)?.dataTime;
  baseTimeDisplayEl.textContent = formatKoreanDateTime(sampleTime);

  const avgValue = calculateAveragePm10Number(items);

  if (avgValue === null) {
    trafficHeroEl.className = 'traffic-hero grade-none';
    trafficEmojiEl.textContent = '⚪';
    trafficStatusTextEl.textContent = '측정 안 됨';
    avgPm10El.textContent = '측정 안 됨';
    trafficActionTipEl.textContent = '현재 모든 측정소가 점검 중이거나 데이터가 없습니다.';
    return;
  }

  const gradeCode = getGradeByPm10Value(avgValue);
  const meta = getGradeMeta(gradeCode);

  trafficHeroEl.className = `traffic-hero ${meta.className}`;
  trafficEmojiEl.textContent = meta.emoji;
  trafficStatusTextEl.textContent = meta.text;
  avgPm10El.textContent = `${avgValue} ㎍/㎥`;

  if (gradeCode === '3' || gradeCode === '4') {
    trafficActionTipEl.textContent = '😷 외출 시 마스크를 챙기세요';
  } else if (gradeCode === '1') {
    trafficActionTipEl.textContent = '🌿 공기가 맑아요. 안심하고 환기하세요!';
  } else if (gradeCode === '2') {
    trafficActionTipEl.textContent = '🙂 무난한 공기 상태예요. 일상 활동에 지장 없어요.';
  } else {
    trafficActionTipEl.textContent = '대기질 정보를 확인 중입니다.';
  }
}

// Chart.js를 이용해 미세먼지 수치 상위 10개 측정소 가로 막대그래프를 렌더링하는 함수입니다
function renderTopDustChart(items) {
  if (!dustChartCanvas) return;

  // '측정 안 됨'(-)인 항목을 제외하고 유효한 숫자 데이터만 필터링합니다
  const validItems = items
    .filter((item) => item.pm10Value && item.pm10Value !== '-' && !Number.isNaN(Number(item.pm10Value)))
    .map((item) => ({
      stationName: item.stationName || '알 수 없음',
      value: Number(item.pm10Value),
      grade: item.pm10Grade || getGradeByPm10Value(Number(item.pm10Value))
    }));

  // 수치가 높은 순으로 내림차순 정렬한 뒤 상위 10개만 선택합니다
  validItems.sort((a, b) => b.value - a.value);
  const top10 = validItems.slice(0, 10);

  // 차트 데이터 배열을 생성합니다
  const labels = top10.map((d) => d.stationName);
  const dataValues = top10.map((d) => d.value);
  const backgroundColors = top10.map((d) => getGradeMeta(d.grade).barColor);
  const borderColors = top10.map((d) => getGradeMeta(d.grade).borderColor);

  // 기존 차트가 있다면 파괴하고 새로 생성합니다
  if (dustChartInstance) {
    dustChartInstance.destroy();
  }

  // 데이터가 없을 경우 처리
  if (top10.length === 0) {
    return;
  }

  const ctx = dustChartCanvas.getContext('2d');
  dustChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '미세먼지 (PM10)',
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 8,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      indexAxis: 'y', // 가로 막대그래프로 설정합니다
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // 단일 데이터셋이므로 범례 숨김
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Pretendard', size: 13, weight: '700' },
          bodyFont: { family: 'Pretendard', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              const item = top10[context.dataIndex];
              const grade = getGradeMeta(item.grade);
              return ` 미세먼지: ${context.parsed.x} ㎍/㎥ (${grade.emoji} ${grade.text})`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: '#f1f5f9'
          },
          ticks: {
            font: { family: 'Pretendard', size: 11 },
            color: '#64748b',
            callback: function (val) {
              return val + ' ㎍';
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Pretendard', size: 12, weight: '600' },
            color: '#1e293b'
          }
        }
      }
    }
  });
}

// 측정소 목록 카드를 화면에 은은한 색상 테두리와 배경으로 렌더링합니다
function renderCards(items) {
  cardGridEl.innerHTML = '';

  if (!items || items.length === 0) {
    statusMessageEl.textContent = '해당 지역의 측정소 데이터가 없습니다.';
    statusMessageEl.style.display = 'block';
    return;
  }

  statusMessageEl.style.display = 'none';

  items.forEach((item) => {
    const meta = getGradeMeta(item.pm10Grade);
    const pm10Text = formatMeasureValue(item.pm10Value);
    const pm25Text = formatMeasureValue(item.pm25Value);
    const timeText = formatKoreanDateTime(item.dataTime);

    const card = document.createElement('div');
    card.className = `card ${meta.className}`;

    card.innerHTML = `
      <div class="card-header">
        <span class="station-name">${item.stationName || '측정소'}</span>
        <span class="grade-badge">${meta.emoji} ${meta.text}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">미세먼지 (PM10)</span>
        <span class="metric-value">${pm10Text}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">초미세먼지 (PM2.5)</span>
        <span class="metric-value">${pm25Text}</span>
      </div>
      <div class="card-time">${timeText}</div>
    `;

    cardGridEl.appendChild(card);
  });
}

// 백엔드 서버리스 API(/api/dust?sido=...)에서 공기질 데이터를 가져옵니다
async function fetchAirQuality(sidoName) {
  selectedSidoEl.textContent = sidoName;
  cardGridEl.innerHTML = '';

  trafficHeroEl.className = 'traffic-hero grade-none';
  trafficEmojiEl.textContent = '⏳';
  trafficStatusTextEl.textContent = '불러오는 중...';
  avgPm10El.textContent = '계산 중...';
  trafficActionTipEl.textContent = `${sidoName} 지역 대기질 데이터를 실시간으로 가져오고 있습니다.`;
  baseTimeDisplayEl.textContent = '최신 데이터 동기화 중...';

  statusMessageEl.textContent = '불러오는 중...';
  statusMessageEl.style.display = 'block';

  // 로딩 중일 때는 이전 차트를 파괴해 둡니다
  if (dustChartInstance) {
    dustChartInstance.destroy();
    dustChartInstance = null;
  }

  try {
    const response = await fetch(`/api/dust?sido=${encodeURIComponent(sidoName)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    }

    const items = data?.response?.body?.items || [];
    updateTrafficHero(items);
    renderTopDustChart(items);
    renderCards(items);
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    trafficHeroEl.className = 'traffic-hero grade-none';
    trafficEmojiEl.textContent = '⚠️';
    trafficStatusTextEl.textContent = '연결 오류';
    avgPm10El.textContent = '-';
    trafficActionTipEl.textContent = '정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    statusMessageEl.textContent = `데이터를 불러오지 못했습니다. (${error.message})`;
    statusMessageEl.style.display = 'block';
  }
}

// 시도 선택 드롭다운 변경 시 새로고침합니다
sidoSelect.addEventListener('change', (e) => {
  fetchAirQuality(e.target.value);
});

// 초기 실행 (기본 선택된 서울 데이터 로딩)
fetchAirQuality(sidoSelect.value);
