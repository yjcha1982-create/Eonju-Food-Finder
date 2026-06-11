# 오늘 뭐 먹지?

카카오 Local API로 현재 위치 또는 입력한 주소에서 도보 500m 안의 식당을
검색하고 카테고리별로 무작위 점심을 고르는 웹앱입니다.

## 실행

```powershell
npm start
```

기본 주소는 `http://127.0.0.1:8000`입니다.

## 카카오 REST API 키

1. [Kakao Developers](https://developers.kakao.com/)에 로그인합니다.
2. `내 애플리케이션`에서 애플리케이션을 추가합니다.
3. `앱 키`에서 REST API 키를 확인합니다.
4. 프로젝트 루트에 `.env`를 만듭니다.

```text
KAKAO_REST_API_KEY=발급받은_REST_API_키
```

이 키 하나로 다음 기능을 사용합니다.

- 좌표 기준 500m 식당·카페 검색
- 주소 또는 장소명 검색
- 현재 좌표의 주소 변환
- 카카오맵 장소 상세 페이지 연결

키는 Node/Vercel 서버에서만 사용하며 브라우저에 노출하지 않습니다.

카카오 키가 없으면 API가 명확한 설정 오류를 반환하며 다른 지도 데이터로
대체하지 않습니다. 식당 이동 링크는 카카오맵 상세 페이지로 연결됩니다.

## Vercel

Vercel 프로젝트의 Environment Variables에 `KAKAO_REST_API_KEY`를 등록하고
재배포합니다.

## 브라우저 저장

저장 위치와 선호 식당은 각 브라우저의 `localStorage`에 저장됩니다.
