import axios from 'axios';

export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'})
    }

    try {
        const rawData = req.body;
        console.log('Received Data: ', rawData);

        // JSON 데이터를 슬랙 포멧으로 변환 
        const slackMessage = convertToSlackFormat(rawData);

        // 메시지 전송
        await sendToSlack(slackMessage);

        res.status(200).json({
            success: true,
            message: '슬랙으로 메시지 전송완료'
        });
    } catch (error) {
        console.error('전송 에러: ', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

function convertToSlackFormat(data) {
    // 원본 JSON을 슬랙 포맷으로 변환 

    let message = {
    };

    // cafe24 웹훅 데이터 처리 
    if (data.event_no && data.resource) {
        const {event_no, resource} = data;
        const {mall_id, client_id, app_name, deleted_date} = resource;
    
        let eventType = getEventType(event_no);
        let color = getEventColor(event_no);

        message.text = `${eventType}`;
        message.attatchments = [{
            color: color,
            title: `이벤트 수신`,
            fields: [
                {
                title: '쇼핑몰 ID',
                value: mall_id || 'N/A',
                short: true
                },
                {
                title: '클라이언트 ID',
                value: client_id || 'N/A',
                short: true
                },
                {
                title: '앱 이름',
                value: app_name || 'N/A',
                short: true
                }
            ],
            footer: 'cafe24 웹훅',
            ts: Math.floor(new Date().getTime() / 1000)
        }];

            // deleted_date가 있는 경우 추가
        if (deleted_date) {
            message.attachments[0].fields.push({
            title: '삭제 일시',
            value: formatDate(deleted_date),
            short: false
        });
        }
    } else {
    // cafe24 포맷이 아닌 경우 기본 처리
    message.text = `📋 알 수 없는 데이터 수신`;
    message.attachments = [{
      color: 'warning',
      text: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
    }];
  }

  return message;

}

// 이벤트 번호에 따른 이벤트 타입 반환
function getEventType(eventNo) {
  const eventTypes = {
    90077: '앱 삭제',
    90001: '주문 생성',
    90002: '주문 수정',
    90003: '주문 취소',
    90010: '상품 등록',
    90011: '상품 수정',
    90020: '회원 가입',
    90021: '회원 정보 수정',
    // 필요한 이벤트 번호들 추가
  };
  
  return eventTypes[eventNo] || `이벤트 (${eventNo})`;
}

// 이벤트에 따른 색상 반환
function getEventColor(eventNo) {
  // 삭제/취소 관련: 빨간색
  if ([90077, 90003].includes(eventNo)) return 'danger';
  
  // 생성/등록 관련: 초록색
  if ([90001, 90010, 90020].includes(eventNo)) return 'good';
  
  // 수정 관련: 노란색
  if ([90002, 90011, 90021].includes(eventNo)) return 'warning';
  
  // 기본: 파란색
  return '#36a64f';
}

async function sendToSlack(message) {
    const slackToken = process.env.SLACK_BOT_TOKEN;

    if (!slackToken) {
        throw new Error('SLACK_BOT_TOKEN이 설정되지 않음');
    }

    const response = await axios.post('https://slack.com/api/chat.postMessage', 
    message, 
    {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data.ok) {
    throw new Error(`슬랙 API 에러: ${response.data.error}`);
  }

  return response.data;
}