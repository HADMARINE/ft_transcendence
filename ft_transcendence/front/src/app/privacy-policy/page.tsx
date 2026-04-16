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
    border: "1px solid rgba(76, 201, 240, 0.25)",
    borderRadius: "20px",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
    padding: "32px",
  },
  kicker: {
    color: "#4cc9f0",
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
    color: "#4cc9f0",
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
    color: "#f72585",
    textDecoration: "none",
    fontWeight: 700,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main style={styles.page}>
      <article style={styles.shell}>
        <div style={styles.kicker}>Mentions légales</div>
        <h1 style={styles.title}>Politique de confidentialité</h1>
        <p style={styles.intro}>
          Cette page explique quelles données sont collectées par Transcendence, comment elles sont utilisées, et quels contrôles vous gardez dessus. L'objectif est de garder des règles simples, transparentes et faciles à retrouver depuis l'application et l'écran de connexion.
        </p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Informations collectées</h2>
          <p style={styles.text}>
            Nous pouvons collecter les informations que vous fournissez lorsque vous créez un compte, vous connectez, mettez à jour votre profil ou participez à des sessions de jeu. Cela peut inclure votre pseudo, votre adresse e-mail, votre jeton d'authentification, votre avatar, votre activité de jeu et des données d'utilisation de base nécessaires au fonctionnement de la plateforme.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Utilisation des données</h2>
          <ul style={styles.list}>
            <li>Pour créer et gérer votre compte.</li>
            <li>Pour vous authentifier et sécuriser votre session.</li>
            <li>Pour afficher votre profil, votre avatar et les informations liées à vos parties.</li>
            <li>Pour faire fonctionner les fonctionnalités multijoueur comme le matchmaking, les lobbies et les événements de partie en direct.</li>
            <li>Pour améliorer la stabilité, diagnostiquer les bugs et protéger le service contre les abus.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Cookies et stockage local</h2>
          <p style={styles.text}>
            L'application peut utiliser des cookies et le stockage local pour l'authentification et la continuité de session. Ces éléments servent à vous maintenir connecté et à prendre en charge les fonctionnalités qui nécessitent une connexion persistante, comme le socket de jeu et la mise à jour du statut utilisateur.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Partage des données</h2>
          <p style={styles.text}>
            Nous ne vendons pas vos données personnelles. Les informations peuvent uniquement être partagées avec les services internes nécessaires au fonctionnement de l'application, ou lorsqu'il est nécessaire de respecter des obligations légales, prévenir la fraude ou protéger les utilisateurs et l'infrastructure.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Vos choix</h2>
          <ul style={styles.list}>
            <li>Vous pouvez mettre à jour vos données de profil depuis la page des paramètres.</li>
            <li>Vous pouvez vider le stockage de votre navigateur pour supprimer les données d'authentification locales.</li>
            <li>Vous pouvez arrêter d'utiliser le service et demander la suppression de votre compte auprès des mainteneurs du projet si ce parcours est activé.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Contact</h2>
          <p style={styles.text}>
            Si vous avez des questions sur cette politique, consultez la documentation du projet ou contactez l'équipe qui maintient l'application.
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
