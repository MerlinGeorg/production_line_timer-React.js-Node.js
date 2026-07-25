import './InfoBar.css';

export default function InfoBar({ session }) {
  const { loginId, buildNumber, numberOfParts, timePerPart } = session;
  const totalMin = numberOfParts * timePerPart;

  const items = [
    { label: 'Login Id',   value: loginId },
    { label: 'Build',      value: buildNumber },
    { label: 'Parts',      value: numberOfParts },
    { label: 'Time / Part', value: timePerPart },
    { label: 'Total Allocated Time', value: totalMin },
  ];

  return (
    <header className="info-bar">
      <div className="info-bar__items"> 
        {items.map(({ label, value }) => (
          <div key={label} className="info-bar__item">
            <span className="info-bar__label">{label}</span>
            <span className="info-bar__value">{value}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
