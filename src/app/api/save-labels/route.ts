import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 요청 데이터 검증
    if (!data.rectangles && !data.polygons) {
      return NextResponse.json(
        { error: '라벨 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 현재 시간 추가
    const timestamp = new Date().toISOString();
    const labelData = {
      ...data,
      savedAt: timestamp,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    };

    // 콘솔에 받은 데이터 출력 (실제 환경에서는 데이터베이스에 저장)
    console.log('=== 라벨 데이터 저장 ===');
    console.log('저장 시간:', timestamp);
    console.log('세션 ID:', labelData.sessionId);
    console.log('사각형 개수:', labelData.rectangles?.length || 0);
    console.log('폴리곤 개수:', labelData.polygons?.length || 0);
    console.log('상세 데이터:', JSON.stringify(labelData, null, 2));
    console.log('========================');

    // 실제 환경에서는 여기서 데이터베이스에 저장
    // 예: await saveToDatabase(labelData);

    return NextResponse.json({
      success: true,
      message: '라벨 데이터가 성공적으로 저장되었습니다.',
      savedCount: {
        rectangles: labelData.rectangles?.length || 0,
        polygons: labelData.polygons?.length || 0,
      },
      savedAt: timestamp,
    });
  } catch (error) {
    console.error('라벨 저장 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
