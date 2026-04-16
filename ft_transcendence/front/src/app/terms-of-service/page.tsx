import Link from "next/link";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0b1020 0%, #141b33 45%, #0a0f1d 100%)",
    color: "#e8eefc",
    padding: "32px 20px 56px",
    fontFamily: "Arial, sans-serif",
  },
  shell: {
    maxWidth: "920px",
    margin: "0 auto",
    background: "rgba(18, 25, 48, 0.88)",
    border: "1px solid rgba(247, 37, 133, 0.25)",
    borderRadius: "20px",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
    padding: "32px",
  },
  kicker: {
    color: "#f72585",
    textTransform: "uppercase" as const,
    letterSpacing: "0.18em",
    fontSize: "0.8rem",
    fontWeight: 700,
    marginBottom: "12px",
  },
  title: {
    fontSize: "clamp(2rem, 4vw, 3.4rem)",
    margin: "0 0 16px",
    lineHeight: 1.05,
  },
  intro: {
    fontSize: "1.05rem",
    lineHeight: 1.7,
    color: "#bfd0ff",
    marginBottom: "28px",
    maxWidth: "75ch",
  },
  section: {
    marginTop: "28px",
  },
  sectionTitle: {
    fontSize: "1.3rem",
    marginBottom: "10px",
    color: "#f72585",
  },
  text: {
    lineHeight: 1.8,
    color: "#d8e2ff",
    margin: 0,
  },
  list: {
    margin: "12px 0 0",
    paddingLeft: "20px",
    lineHeight: 1.8,
    color: "#d8e2ff",
  },
  footer: {
    marginTop: "32px",
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#90a4d4",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "20px",
  },
  link: {
    color: "#4cc9f0",
    textDecoration: "none",
    fontWeight: 700,
  },
};

export default function TermsOfServicePage() {
  return (
    <main style={styles.page}>
      <article style={styles.shell}>
        <div style={styles.kicker}>Mentions légales</div>
        <h1 style={styles.title}>Conditions d'utilisation</h1>
        <p style={styles.intro}>
          Ces conditions décrivent les règles d'utilisation de Transcendence. Elles couvrent l'utilisation du compte, les comportements acceptables et les limites de responsabilité du service.
        </p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Acceptation des conditions</h2>
          <p style={styles.text}>
            En créant un compte ou en utilisant l'application, vous acceptez de respecter ces conditions. Si vous ne les acceptez pas, vous ne devez pas continuer à utiliser le service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Responsabilité du compte</h2>
          <ul style={styles.list}>
            <li>Vous êtes responsable de la sécurité de vos identifiants de connexion.</li>
            <li>Vous devez fournir des informations exactes lors de la création et de la mise à jour de votre profil.</li>
            <li>Vous êtes responsable des actions effectuées depuis votre compte.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Utilisation autorisée</h2>
          <p style={styles.text}>
            Vous vous engagez à ne pas détourner la plateforme de son usage, tenter un accès non autorisé, perturber les services, exploiter des bugs ou utiliser des outils automatisés d'une manière qui nuit au gameplay ou aux autres utilisateurs. Le fair-play est attendu dans tous les modes de jeu.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Disponibilité du service</h2>
          <p style={styles.text}>
            L'application est fournie en l'état. Les fonctionnalités peuvent évoluer, cesser temporairement de fonctionner ou être indisponibles pendant la maintenance, les mises à jour ou des incidents techniques. Nous ne garantissons pas un accès sans interruption.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Données et contenus de jeu</h2>
          <p style={styles.text}>
            L'historique des parties, les profils et les informations associées peuvent être stockés pour soutenir le gameplay, la progression et l'expérience utilisateur. Le contenu généré par les utilisateurs reste soumis à modération si nécessaire pour maintenir la plateforme sûre et fonctionnelle.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Limitation de responsabilité</h2>
          <p style={styles.text}>
            Dans la mesure permise par la loi applicable, les mainteneurs ne sont pas responsables des pertes indirectes, des pertes de données ou des dommages résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Modifications de ces conditions</h2>
          <p style={styles.text}>
            Ces conditions peuvent être mises à jour au fil de l'évolution du projet. La version la plus récente devrait toujours être accessible depuis l'application afin que les utilisateurs puissent la consulter facilement avant de se connecter ou de jouer.
          </p>
        </section>

        <div style={styles.footer}>
          <span>Dernière mise à jour : 16 avril 2026</span>
          <Link href="/login" style={styles.link}>
            Retour à la connexion
          </Link>
        </div>
      </article>
    </main>
  );
}
