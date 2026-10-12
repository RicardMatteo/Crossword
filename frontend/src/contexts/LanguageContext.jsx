"use client"

import { createContext, useContext, useState, useEffect } from "react"

const LanguageContext = createContext()

/**
 * Language provider that manages multi-language state
 * Supports French, English, Spanish, and German
 */

const translations = {
  fr: {
    // Navigation
    home: "Accueil",
    profile: "Profil",
    logout: "Déconnexion",
    login: "Connexion",
    signup: "Inscription",

    // Homepage
    heroTitle: "Maîtrisez l'Art des",
    heroTitleHighlight: "Mots Croisés",
    heroDescription:
      "Défiez votre esprit avec nos grilles de mots croisés interactives. Jouez en solo ou affrontez vos amis en temps réel.",
    createGame: "🎮 Créer une Partie",
    signIn: "👤 Se Connecter",
    publicGames: "Parties Publiques",

    // Game
    roomLabel: "Salon :",
    playerLabel: "Joueur :",
    enterName: "Entrez votre nom",
    shareRoom: "📋 Partager le Salon",
    leaveGame: "🚪 Quitter la Partie",
    otherPlayersProgress: "Progression des Autres Joueurs",
    noOtherPlayers: "Aucun autre joueur connecté",

    // Lobby
    gameLobby: "Salon de Jeu",
    gameSettings: "Paramètres de Jeu",
    gameMode: "Mode de Jeu",
    privacy: "Confidentialité",
    ranked: "Classé",
    startGame: "Démarrer la Partie",
    waitingForPlayers: "En attente de joueurs...",
    playersInLobby: "Joueurs dans le salon",

    // Game End
    gameFinished: "Partie Terminée !",
    congratulations: "Félicitations !",
    finalStats: "Statistiques Finales",
    playAgain: "Rejouer",

    // Auth
    name: "Nom",
    email: "Email",
    password: "Mot de passe",
    alreadyAccount: "Vous avez déjà un compte ?",
    noAccount: "Vous n'avez pas de compte ?",

    // Profile
    gamesPlayed: "Parties Jouées",
    gamesWon: "Parties Gagnées",
    winRate: "Taux de Victoire",
    averageTime: "Temps Moyen",
    bestTime: "Meilleur Temps",
    wordsGuessed: "Mots Trouvés",

    // 404
    pageNotFound: "Oups ! Page Introuvable",
    pageNotFoundDesc:
      "Il semble que cette page se soit perdue dans la grille de mots croisés. Retournons résoudre des énigmes !",
    backToHome: "🏠 Retour à l'Accueil",
    goBack: "← Retour",

    // Features
    whyChoose: "Pourquoi Choisir CrosswordMaster ?",
    featuresDesc:
      "Découvrez la plateforme de mots croisés la plus avancée avec des fonctionnalités conçues pour les passionnés de puzzles modernes.",
    smartDifficulty: "Difficulté Intelligente",
    smartDifficultyDesc: "Puzzles adaptatifs qui correspondent à votre niveau et vous aident à progresser.",
    multiplayerFun: "Multijoueur Amusant",
    multiplayerDesc: "Affrontez vos amis ou rejoignez des parties publiques avec des joueurs du monde entier.",
    crossPlatform: "Multi-Plateforme",
    crossPlatformDesc: "Jouez de manière transparente sur tous vos appareils avec un design responsive.",
    achievements: "Succès",
    achievementsDesc: "Débloquez des badges, suivez vos progrès et grimpez dans les classements.",
    customThemes: "Thèmes Personnalisés",
    customThemesDesc: "Personnalisez votre expérience avec les modes clair/sombre et les schémas de couleurs.",
    realTimePlay: "Jeu en Temps Réel",
    realTimePlayDesc: "Voyez les progrès des autres joueurs en temps réel avec des mises à jour en direct.",
  },
  en: {
    // Navigation
    home: "Home",
    profile: "Profile",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",

    // Homepage
    heroTitle: "Master the Art of",
    heroTitleHighlight: "Crosswords",
    heroDescription:
      "Challenge your mind with our interactive crossword puzzles. Play solo or compete with friends in real-time multiplayer games.",
    createGame: "🎮 Create New Game",
    signIn: "👤 Sign In",
    publicGames: "Public Games",

    // Game
    roomLabel: "Room:",
    playerLabel: "Player:",
    enterName: "Enter your name",
    shareRoom: "📋 Share Room",
    leaveGame: "🚪 Leave Game",
    otherPlayersProgress: "Other Players Progress",
    noOtherPlayers: "No other players connected",

    // Lobby
    gameLobby: "Game Lobby",
    gameSettings: "Game Settings",
    gameMode: "Game Mode",
    privacy: "Privacy",
    ranked: "Ranked",
    startGame: "Start Game",
    waitingForPlayers: "Waiting for players...",
    playersInLobby: "Players in lobby",

    // Game End
    gameFinished: "Game Finished!",
    congratulations: "Congratulations!",
    finalStats: "Final Statistics",
    playAgain: "Play Again",

    // Auth
    name: "Name",
    email: "Email",
    password: "Password",
    alreadyAccount: "Already have an account?",
    noAccount: "Don't have an account?",

    // Profile
    gamesPlayed: "Games Played",
    gamesWon: "Games Won",
    winRate: "Win Rate",
    averageTime: "Average Time",
    bestTime: "Best Time",
    wordsGuessed: "Words Guessed",

    // 404
    pageNotFound: "Oops! Page Not Found",
    pageNotFoundDesc: "Looks like this page got lost in the crossword grid. Let's get you back to solving puzzles!",
    backToHome: "🏠 Back to Home",
    goBack: "← Go Back",

    // Features
    whyChoose: "Why Choose CrosswordMaster?",
    featuresDesc:
      "Experience the most advanced crossword platform with features designed for modern puzzle enthusiasts.",
    smartDifficulty: "Smart Difficulty",
    smartDifficultyDesc: "Adaptive puzzles that match your skill level and help you improve over time.",
    multiplayerFun: "Multiplayer Fun",
    multiplayerDesc: "Compete with friends or join public games with players from around the world.",
    crossPlatform: "Cross-Platform",
    crossPlatformDesc: "Play seamlessly across all your devices with responsive design and sync.",
    achievements: "Achievements",
    achievementsDesc: "Unlock badges, track your progress, and climb the global leaderboards.",
    customThemes: "Custom Themes",
    customThemesDesc: "Personalize your experience with light/dark modes and custom color schemes.",
    realTimePlay: "Real-time Play",
    realTimePlayDesc: "See other players' progress in real-time with live updates and notifications.",
  },
  es: {
    // Navigation
    home: "Inicio",
    profile: "Perfil",
    logout: "Cerrar Sesión",
    login: "Iniciar Sesión",
    signup: "Registrarse",

    // Homepage
    heroTitle: "Domina el Arte de los",
    heroTitleHighlight: "Crucigramas",
    heroDescription:
      "Desafía tu mente con nuestros crucigramas interactivos. Juega solo o compite con amigos en tiempo real.",
    createGame: "🎮 Crear Juego",
    signIn: "👤 Iniciar Sesión",
    publicGames: "Juegos Públicos",

    // Game
    roomLabel: "Sala:",
    playerLabel: "Jugador:",
    enterName: "Ingresa tu nombre",
    shareRoom: "📋 Compartir Sala",
    leaveGame: "🚪 Salir del Juego",
    otherPlayersProgress: "Progreso de Otros Jugadores",
    noOtherPlayers: "No hay otros jugadores conectados",

    // Lobby
    gameLobby: "Sala de Juego",
    gameSettings: "Configuración del Juego",
    gameMode: "Modo de Juego",
    privacy: "Privacidad",
    ranked: "Clasificado",
    startGame: "Iniciar Juego",
    waitingForPlayers: "Esperando jugadores...",
    playersInLobby: "Jugadores en la sala",

    // Game End
    gameFinished: "¡Juego Terminado!",
    congratulations: "¡Felicitaciones!",
    finalStats: "Estadísticas Finales",
    playAgain: "Jugar de Nuevo",

    // Auth
    name: "Nombre",
    email: "Correo",
    password: "Contraseña",
    alreadyAccount: "¿Ya tienes una cuenta?",
    noAccount: "¿No tienes una cuenta?",

    // Profile
    gamesPlayed: "Juegos Jugados",
    gamesWon: "Juegos Ganados",
    winRate: "Tasa de Victoria",
    averageTime: "Tiempo Promedio",
    bestTime: "Mejor Tiempo",
    wordsGuessed: "Palabras Adivinadas",

    // 404
    pageNotFound: "¡Ups! Página No Encontrada",
    pageNotFoundDesc: "Parece que esta página se perdió en el crucigrama. ¡Volvamos a resolver acertijos!",
    backToHome: "🏠 Volver al Inicio",
    goBack: "← Volver",

    // Features
    whyChoose: "¿Por Qué Elegir CrosswordMaster?",
    featuresDesc:
      "Experimenta la plataforma de crucigramas más avanzada con características diseñadas para entusiastas modernos.",
    smartDifficulty: "Dificultad Inteligente",
    smartDifficultyDesc: "Puzzles adaptativos que coinciden con tu nivel y te ayudan a mejorar.",
    multiplayerFun: "Diversión Multijugador",
    multiplayerDesc: "Compite con amigos o únete a juegos públicos con jugadores de todo el mundo.",
    crossPlatform: "Multiplataforma",
    crossPlatformDesc: "Juega sin problemas en todos tus dispositivos con diseño responsivo.",
    achievements: "Logros",
    achievementsDesc: "Desbloquea insignias, sigue tu progreso y escala en las clasificaciones.",
    customThemes: "Temas Personalizados",
    customThemesDesc: "Personaliza tu experiencia con modos claro/oscuro y esquemas de colores.",
    realTimePlay: "Juego en Tiempo Real",
    realTimePlayDesc: "Ve el progreso de otros jugadores en tiempo real con actualizaciones en vivo.",
  },
  de: {
    // Navigation
    home: "Startseite",
    profile: "Profil",
    logout: "Abmelden",
    login: "Anmelden",
    signup: "Registrieren",

    // Homepage
    heroTitle: "Meistere die Kunst der",
    heroTitleHighlight: "Kreuzworträtsel",
    heroDescription:
      "Fordere deinen Geist mit unseren interaktiven Kreuzworträtseln heraus. Spiele allein oder tritt gegen Freunde in Echtzeit an.",
    createGame: "🎮 Spiel Erstellen",
    signIn: "👤 Anmelden",
    publicGames: "Öffentliche Spiele",

    // Game
    roomLabel: "Raum:",
    playerLabel: "Spieler:",
    enterName: "Namen eingeben",
    shareRoom: "📋 Raum Teilen",
    leaveGame: "🚪 Spiel Verlassen",
    otherPlayersProgress: "Fortschritt Anderer Spieler",
    noOtherPlayers: "Keine anderen Spieler verbunden",

    // Lobby
    gameLobby: "Spiel-Lobby",
    gameSettings: "Spieleinstellungen",
    gameMode: "Spielmodus",
    privacy: "Privatsphäre",
    ranked: "Gewertet",
    startGame: "Spiel Starten",
    waitingForPlayers: "Warte auf Spieler...",
    playersInLobby: "Spieler in der Lobby",

    // Game End
    gameFinished: "Spiel Beendet!",
    congratulations: "Glückwunsch!",
    finalStats: "Endstatistiken",
    playAgain: "Nochmal Spielen",

    // Auth
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    alreadyAccount: "Bereits ein Konto?",
    noAccount: "Noch kein Konto?",

    // Profile
    gamesPlayed: "Gespielte Spiele",
    gamesWon: "Gewonnene Spiele",
    winRate: "Gewinnrate",
    averageTime: "Durchschnittszeit",
    bestTime: "Beste Zeit",
    wordsGuessed: "Erratene Wörter",

    // 404
    pageNotFound: "Ups! Seite Nicht Gefunden",
    pageNotFoundDesc: "Diese Seite scheint sich im Kreuzworträtsel verirrt zu haben. Lass uns zurück zum Rätsellösen!",
    backToHome: "🏠 Zurück zur Startseite",
    goBack: "← Zurück",

    // Features
    whyChoose: "Warum CrosswordMaster Wählen?",
    featuresDesc:
      "Erlebe die fortschrittlichste Kreuzworträtsel-Plattform mit Features für moderne Rätsel-Enthusiasten.",
    smartDifficulty: "Intelligente Schwierigkeit",
    smartDifficultyDesc: "Adaptive Rätsel, die deinem Level entsprechen und dir beim Verbessern helfen.",
    multiplayerFun: "Mehrspieler-Spaß",
    multiplayerDesc: "Tritt gegen Freunde an oder tritt öffentlichen Spielen mit Spielern weltweit bei.",
    crossPlatform: "Plattformübergreifend",
    crossPlatformDesc: "Spiele nahtlos auf allen deinen Geräten mit responsivem Design.",
    achievements: "Erfolge",
    achievementsDesc: "Schalte Abzeichen frei, verfolge deinen Fortschritt und klettere in den Ranglisten.",
    customThemes: "Benutzerdefinierte Themes",
    customThemesDesc: "Personalisiere deine Erfahrung mit Hell-/Dunkelmodus und benutzerdefinierten Farbschemata.",
    realTimePlay: "Echtzeit-Spiel",
    realTimePlayDesc: "Sieh den Fortschritt anderer Spieler in Echtzeit mit Live-Updates.",
  },
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const savedLanguage = localStorage.getItem("crossword-language")
    return savedLanguage || "fr" // Default to French
  })

  useEffect(() => {
    localStorage.setItem("crossword-language", language)
    document.documentElement.setAttribute("lang", language)
  }, [language])

  const setLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguageState(newLanguage)
    }
  }

  const toggleLanguage = () => {
    setLanguageState((prevLang) => (prevLang === "fr" ? "en" : "fr"))
  }

  const t = (key) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>{children}</LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
