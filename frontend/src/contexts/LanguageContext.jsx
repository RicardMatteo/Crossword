"use client"

import { createContext, useContext, useState, useEffect } from "react"

const LanguageContext = createContext()

/**
 * Language provider that manages multi-language state
 * Supports French, English, Spanish, and German
 */

const translations = {
  fr: {
    // Game end
    modeClassic: "Classique (chacun sa grille)",
    modeCoop: "Coop (grille commune)",
    modeInfo_coop: "Coop : tout le monde remplit la même grille.",
    teamProgress: "Grille commune",
    lettersShort: "lettres",
    teamFinished: "Grille terminée en équipe en {time} !",
    contribution: "Part de la grille",
    endRule: "Fin de partie",
    endRuleFirst: "Le premier qui finit",
    endRuleAll: "Quand tous ont fini",
    endRuleDelay: "Premier fini + délai",
    endDelaySeconds: "Délai (secondes)",
    endRuleInfo_first: "Fin dès qu'un joueur termine la grille.",
    endRuleInfo_all: "Fin quand tout le monde a terminé.",
    endRuleInfo_delay: "Après le premier, les autres ont {s} s pour finir.",
    playerFinished: "{name} a terminé en {time} !",
    youFinished: "Vous avez terminé ! En attente des autres…",
    endsIn: "Fin dans {s} s",
    youWin: "Vous gagnez !",
    winnerIs: "{name} gagne !",
    player: "Joueur",
    time: "Temps",
    completion: "Grille",
    words: "Mots",
    notFinished: "non terminé",
    waitingForOwnerRestart: "En attente du créateur pour rejouer…",
    solutionLegend: "Solution : en vert les lettres que vous avez trouvées, en rouge celles qui manquaient.",
    // Homepage
    homeTitle: "Mots fléchés à plusieurs",
    homeSubtitle: "Créez un salon, partagez son code et remplissez la même grille que vos amis en voyant leur progression en direct.",
    yourName: "Votre pseudo",
    newGame: "Créer une partie",
    roomCode: "Code du salon",
    join: "Rejoindre",
    nameRequired: "Choisissez un pseudo pour jouer.",
    refresh: "Actualiser",
    loading: "Chargement…",
    noPublicGames: "Aucune partie publique en attente pour le moment.",
    playersShort: "joueur(s)",
    // Navigation
    home: "Accueil",
    profile: "Profil",
    logout: "Déconnexion",
    login: "Connexion",
    signup: "Inscription",

    // Homepage
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

  },
  en: {
    // Game end
    modeClassic: "Classic (one grid each)",
    modeCoop: "Coop (shared grid)",
    modeInfo_coop: "Coop: everyone fills the same grid.",
    teamProgress: "Shared grid",
    lettersShort: "letters",
    teamFinished: "Grid completed as a team in {time}!",
    contribution: "Share of the grid",
    endRule: "Game end",
    endRuleFirst: "First to finish",
    endRuleAll: "When everyone is done",
    endRuleDelay: "First to finish + delay",
    endDelaySeconds: "Delay (seconds)",
    endRuleInfo_first: "Ends as soon as a player completes the grid.",
    endRuleInfo_all: "Ends when everyone is done.",
    endRuleInfo_delay: "After the first one, the others have {s} s to finish.",
    playerFinished: "{name} finished in {time}!",
    youFinished: "You're done! Waiting for the others…",
    endsIn: "Ends in {s} s",
    youWin: "You win!",
    winnerIs: "{name} wins!",
    player: "Player",
    time: "Time",
    completion: "Grid",
    words: "Words",
    notFinished: "not finished",
    waitingForOwnerRestart: "Waiting for the host to play again…",
    solutionLegend: "Solution: green letters are the ones you found, red ones were missing.",
    // Homepage
    homeTitle: "Arrow crosswords with friends",
    homeSubtitle: "Create a room, share its code and fill the same grid as your friends while watching their progress live.",
    yourName: "Your name",
    newGame: "Create a game",
    roomCode: "Room code",
    join: "Join",
    nameRequired: "Pick a name to play.",
    refresh: "Refresh",
    loading: "Loading…",
    noPublicGames: "No public game waiting right now.",
    playersShort: "player(s)",
    // Navigation
    home: "Home",
    profile: "Profile",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",

    // Homepage
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

  },
  es: {
    // Game end
    modeClassic: "Clásico (cada uno su cuadrícula)",
    modeCoop: "Coop (cuadrícula compartida)",
    modeInfo_coop: "Coop: todos rellenan la misma cuadrícula.",
    teamProgress: "Cuadrícula compartida",
    lettersShort: "letras",
    teamFinished: "¡Cuadrícula completada en equipo en {time}!",
    contribution: "Parte de la cuadrícula",
    endRule: "Fin de la partida",
    endRuleFirst: "El primero en terminar",
    endRuleAll: "Cuando todos terminen",
    endRuleDelay: "Primero + tiempo extra",
    endDelaySeconds: "Tiempo extra (segundos)",
    endRuleInfo_first: "Termina en cuanto un jugador completa la cuadrícula.",
    endRuleInfo_all: "Termina cuando todos han acabado.",
    endRuleInfo_delay: "Tras el primero, los demás tienen {s} s para terminar.",
    playerFinished: "¡{name} terminó en {time}!",
    youFinished: "¡Has terminado! Esperando a los demás…",
    endsIn: "Termina en {s} s",
    youWin: "¡Has ganado!",
    winnerIs: "¡{name} gana!",
    player: "Jugador",
    time: "Tiempo",
    completion: "Cuadrícula",
    words: "Palabras",
    notFinished: "sin terminar",
    waitingForOwnerRestart: "Esperando a que el anfitrión vuelva a jugar…",
    solutionLegend: "Solución: en verde las letras que encontraste, en rojo las que faltaban.",
    // Homepage
    homeTitle: "Autodefinidos entre amigos",
    homeSubtitle: "Crea una sala, comparte su código y rellena la misma cuadrícula que tus amigos viendo su progreso en directo.",
    yourName: "Tu nombre",
    newGame: "Crear partida",
    roomCode: "Código de sala",
    join: "Unirse",
    nameRequired: "Elige un nombre para jugar.",
    refresh: "Actualizar",
    loading: "Cargando…",
    noPublicGames: "Ninguna partida pública esperando ahora mismo.",
    playersShort: "jugador(es)",
    // Navigation
    home: "Inicio",
    profile: "Perfil",
    logout: "Cerrar Sesión",
    login: "Iniciar Sesión",
    signup: "Registrarse",

    // Homepage
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

  },
  de: {
    // Game end
    modeClassic: "Klassisch (jeder sein Rätsel)",
    modeCoop: "Koop (gemeinsames Rätsel)",
    modeInfo_coop: "Koop: Alle füllen dasselbe Rätsel aus.",
    teamProgress: "Gemeinsames Rätsel",
    lettersShort: "Buchstaben",
    teamFinished: "Rätsel im Team in {time} gelöst!",
    contribution: "Anteil am Rätsel",
    endRule: "Spielende",
    endRuleFirst: "Wer zuerst fertig ist",
    endRuleAll: "Wenn alle fertig sind",
    endRuleDelay: "Erster fertig + Nachspielzeit",
    endDelaySeconds: "Nachspielzeit (Sekunden)",
    endRuleInfo_first: "Endet, sobald ein Spieler das Rätsel gelöst hat.",
    endRuleInfo_all: "Endet, wenn alle fertig sind.",
    endRuleInfo_delay: "Nach dem Ersten haben die anderen {s} s Zeit.",
    playerFinished: "{name} ist in {time} fertig!",
    youFinished: "Du bist fertig! Warte auf die anderen…",
    endsIn: "Ende in {s} s",
    youWin: "Du gewinnst!",
    winnerIs: "{name} gewinnt!",
    player: "Spieler",
    time: "Zeit",
    completion: "Rätsel",
    words: "Wörter",
    notFinished: "nicht fertig",
    waitingForOwnerRestart: "Warte darauf, dass der Gastgeber neu startet…",
    solutionLegend: "Lösung: grün die Buchstaben, die du gefunden hast, rot die fehlenden.",
    // Homepage
    homeTitle: "Schwedenrätsel mit Freunden",
    homeSubtitle: "Erstelle einen Raum, teile den Code und fülle dasselbe Rätsel wie deine Freunde aus – ihren Fortschritt siehst du live.",
    yourName: "Dein Name",
    newGame: "Spiel erstellen",
    roomCode: "Raumcode",
    join: "Beitreten",
    nameRequired: "Wähle einen Namen, um zu spielen.",
    refresh: "Aktualisieren",
    loading: "Lädt…",
    noPublicGames: "Gerade wartet kein öffentliches Spiel.",
    playersShort: "Spieler",
    // Navigation
    home: "Startseite",
    profile: "Profil",
    logout: "Abmelden",
    login: "Anmelden",
    signup: "Registrieren",

    // Homepage
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
