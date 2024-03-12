type Props = {
  timestamp: string;
};

export default function DateFormatter({ timestamp }: Props) {
  const date = new Date(timestamp);
  const jstDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  return <>{jstDate}</>;
}
