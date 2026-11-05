// Vercel 서버리스 함수로 동작하는 핸들러 함수를 내보냅니다
export default async function handler(req, res) {
  // 주소 쿼리에서 sido(시도 이름) 값을 읽고, 없으면 기본값으로 '서울'을 사용합니다
  const sido = req.query.sido || '서울';

  // 서버 환경변수(AIRKOREA_KEY)에서 에어코리아 인증키를 읽어옵니다
  const apiKey = process.env.AIRKOREA_KEY;

  // 환경변수에 인증키가 설정되어 있지 않으면 한국어 오류 메시지를 반환합니다
  if (!apiKey) {
    // 500 상태 코드와 함께 환경변수 누락 안내 메시지를 JSON으로 돌려줍니다
    return res.status(500).json({
      error: true,
      message: '서버에 AIRKOREA_KEY 환경변수가 설정되어 있지 않습니다.'
    });
  }

  // 에어코리아 시도별 실시간 측정정보 조회 API의 기본 요청 주소입니다
  const baseUrl = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';

  // 요청 주소에 붙일 파라미터들을 조합하며, 인증키와 시도 이름을 encodeURIComponent로 감싸줍니다
  const queryParams = [
    `serviceKey=${encodeURIComponent(apiKey)}`, // 환경변수의 인증키를 encodeURIComponent로 감싸서 붙입니다
    'returnType=json', // 응답 형식을 JSON으로 요청합니다
    'numOfRows=100', // 한 페이지에 최대 100개의 측정소 데이터를 요청합니다
    'pageNo=1', // 첫 번째 페이지를 조회합니다
    `sidoName=${encodeURIComponent(sido)}`, // 시도 이름을 URL 인코딩하여 붙입니다
    'ver=1.3' // 초미세먼지(PM2.5) 정보를 포함하는 1.3 버전을 사용합니다
  ].join('&');

  // 최종 호출할 전체 URL을 만듭니다
  const requestUrl = `${baseUrl}?${queryParams}`;

  try {
    // 공공데이터포털 API를 호출하고 응답을 기다립니다
    const response = await fetch(requestUrl);
    // 응답 본문을 먼저 문자열로 읽어옵니다 (XML 에러 응답을 판별하기 위함입니다)
    const rawText = await response.text();

    // 문자열을 JSON으로 파싱할 변수를 선언합니다
    let data;
    try {
      // 응답 텍스트를 JSON 객체로 변환합니다
      data = JSON.parse(rawText);
    } catch (parseError) {
      // JSON이 아니라 XML 에러 등으로 온 경우 한국어 안내 메시지를 돌려줍니다
      return res.status(502).json({
        error: true,
        message: '인증키 또는 요청값을 확인해주세요'
      });
    }

    // 응답 본문 안의 결과 코드(resultCode)와 결과 메시지(resultMsg)를 확인합니다
    const resultCode = data?.response?.header?.resultCode;
    const resultMsg = data?.response?.header?.resultMsg;

    // resultCode가 성공('00')이 아닐 때는 한국어 오류 메시지로 알려줍니다
    if (resultCode !== '00') {
      return res.status(400).json({
        error: true,
        message: `공공데이터포털 응답 오류가 발생했습니다. (코드: ${resultCode || '알 수 없음'}, 사유: ${resultMsg || '인증키 또는 요청값을 확인해주세요'})`
      });
    }

    // 정상 응답인 경우 프론트엔드로 데이터를 그대로 전달합니다
    return res.status(200).json(data);
  } catch (error) {
    // 네트워크 장애 등 예외가 발생했을 때 한국어 오류 메시지를 돌려줍니다
    return res.status(500).json({
      error: true,
      message: '대기오염 데이터를 불러오는 중 서버 오류가 발생했습니다.'
    });
  }
}

