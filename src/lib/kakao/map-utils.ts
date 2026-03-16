// 타입 선언은 src/types/kakao.d.ts에 있음

// 카카오맵 스크립트 로드
export function loadKakaoMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('SSR');
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject('카카오맵 스크립트 로드 실패');
    document.head.appendChild(script);
  });
}

// 좌표 → 주소 변환
export function coordToAddress(
  lat: number,
  lng: number
): Promise<{ address: string; regionCode: string }> {
  return new Promise((resolve, reject) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === 'OK' && result[0]) {
        const addr = result[0].road_address || result[0].address;
        const region = result[0].address;
        resolve({
          address: addr.address_name,
          regionCode: `${region.region_1depth_name} ${region.region_2depth_name}`,
        });
      } else {
        reject('주소를 찾을 수 없습니다');
      }
    });
  });
}

// 주소 → 좌표 변환
export function addressToCoord(
  address: string
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === 'OK' && result[0]) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
        });
      } else {
        reject('좌표를 찾을 수 없습니다');
      }
    });
  });
}
