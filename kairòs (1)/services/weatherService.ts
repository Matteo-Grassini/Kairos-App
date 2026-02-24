
export interface WeatherData {
    temperature: number;
    weatherCode: number;
    isDay: boolean;
}

// Mapping WMO Weather interpretation codes (WW)
export const getWeatherDescription = (code: number): string => {
    if (code === 0) return 'Sereno';
    if (code >= 1 && code <= 3) return 'Nuvoloso';
    if (code >= 45 && code <= 48) return 'Nebbia';
    if (code >= 51 && code <= 55) return 'Pioggerella';
    if (code >= 61 && code <= 67) return 'Pioggia';
    if (code >= 71 && code <= 77) return 'Neve';
    if (code >= 80 && code <= 82) return 'Rovesci';
    if (code >= 95 && code <= 99) return 'Temporale';
    return 'Variabile';
};

export const fetchWeather = async (lat: number, lng: number): Promise<WeatherData | null> => {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`
        );
        const data = await response.json();
        
        if (!data.current) return null;

        return {
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1
        };
    } catch (error) {
        console.error("Weather fetch error:", error);
        return null;
    }
};
