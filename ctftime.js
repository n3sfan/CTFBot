export async function getEventsInWeek() {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
    }

    var date = new Date();
    var now = Math.floor(+date / 1000);
    date.setDate(date.getDate() + 7);  
    var seven_week = Math.floor(+date / 1000);

    var url = `https://ctftime.org/api/v1/events/?limit=20&start=${now}&finish=${seven_week}`;
    var response = await fetch(url, {
        method: 'GET',
        headers: headers
    });
    var events = await response.json();
    return events;
}
