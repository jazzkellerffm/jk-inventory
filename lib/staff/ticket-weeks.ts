import { serviceDate } from "./service-day";

const berlin = new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin"});
export const ticketDay = (seconds:number) => berlin.format(seconds*1000);
export function weekDay(seconds:number,offset:number) {
  const date=new Date(serviceDate(seconds*1000)+"T12:00:00Z");
  date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7+offset);
  return date.toISOString().slice(0,10);
}
