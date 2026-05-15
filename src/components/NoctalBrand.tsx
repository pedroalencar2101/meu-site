import { Link } from 'react-router-dom';

type Props = {
  /** Mostrar texto NOCTAL ao lado da logo (responsivo por defeito). */
  showText?: boolean;
  className?: string;
};

/** Logo + texto NOCTAL metalizado — link para o feed (Home). */
export default function NoctalBrand({ showText = true, className = '' }: Props) {
  return (
    <Link to="/" className={`noctal-brand-link ${className}`} aria-label="Noctal — ir para o início">
      <img src="/logo.png" alt="" className="noctal-brand-logo" />
      {showText && <span className="noctal-brand-text">NOCTAL</span>}
    </Link>
  );
}
