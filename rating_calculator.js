// Калькулятор рейтинга для Мафии (JavaScript версия)

function calculateGame(players, sheriffChecksStr) {
    // Анализ игры
    const analysis = analyzeGame(players);

    // Парсим проверки шерифа
    const sheriffChecks = parseSheriffChecks(sheriffChecksStr);

    // Рассчитываем баллы для каждого игрока
    const results = [];

    players.forEach((player, index) => {
        const playerNum = index + 1;
        let points = 0;
        const achievements = [];
        let black_checks = 0;
        let red_checks = 0;

        const isAlive = player.killed_when === '0' || !player.killed_when;
        const team = (player.role === 'Мафия' || player.role === 'Дон') ? 'Мафия' : 'Мирные';
        const won = team === analysis.winner;

        // Базовые начисления по ролям
        if (player.role === 'Мирный') {
            if (won) {
                points += 4; // Победа за мирного
                if (analysis.is_clean_win) {
                    points += 1; // Чистая победа
                    achievements.push('Чистая победа');
                }
                if (analysis.is_guessing && analysis.guessing_players.includes(player.name)) {
                    points += 2; // Победа в угадайке
                    achievements.push('Победа в угадайке');
                }
            }
        } else if (player.role === 'Мафия') {
            if (won) {
                points += 5; // Победа за мафию
                if (analysis.is_dry_win) {
                    points += 1; // Победа в сухую
                    achievements.push('Победа в сухую');
                }
                if (analysis.is_guessing && analysis.guessing_players.includes(player.name)) {
                    points += 3; // Победа в угадайке
                    achievements.push('Победа в угадайке');
                }
            }
        } else if (player.role === 'Дон') {
            if (won) {
                points += 5; // Победа за мафию (базовые очки команды)
                points += 3; // Дополнительно за роль Дона
                if (isAlive) {
                    points += 1; // Не покидал стола
                    achievements.push('Не покидал стола');
                }
                if (analysis.is_dry_win) {
                    points += 1; // Победа в сухую
                    achievements.push('Победа в сухую');
                }
                if (analysis.is_guessing && analysis.guessing_players.includes(player.name)) {
                    points += 3; // Победа в угадайке
                    achievements.push('Победа в угадайке');
                }
            } else {
                points -= 3; // Поражение за дона
            }
        } else if (player.role === 'Шериф') {
            // Проверки шерифа
            if (sheriffChecks.length > 0) {
                const checks = calculateSheriffChecks(player, sheriffChecks, players);
                black_checks = checks.black;
                red_checks = checks.red;

                if (black_checks >= 3) {
                    points += 3;
                    achievements.push('3 черные проверки');
                }
            }

            if (won) {
                points += 4; // Победа за мирных (базовые очки команды)
                points += 3; // Дополнительно за роль Шерифа
                if (isAlive) {
                    points += 2; // Не покидал стола
                    achievements.push('Не покидал стола');
                }
                if (analysis.is_clean_win) {
                    points += 1; // Чистая победа
                    achievements.push('Чистая победа');
                }
                if (analysis.is_guessing && analysis.guessing_players.includes(player.name)) {
                    points += 2; // Победа в угадайке
                    achievements.push('Победа в угадайке');
                }
            } else {
                points -= 3; // Поражение за шерифа
            }

            // Покинул игру рано
            const killDay = getKillDay(player.killed_when);
            if (killDay > 0 && killDay <= 2 && player.killed_when.includes('D')) {
                points -= 1;
                achievements.push('Покинул игру в 1-й или 2-й день');
            }
        }

        results.push({
            player_name: player.name,
            role: player.role,
            death_time: player.killed_when,
            is_alive: isAlive,
            points: points,
            black_checks: black_checks,
            red_checks: red_checks,
            achievements: achievements
        });
    });

    return {
        winner: analysis.winner,
        is_clean_win: analysis.is_clean_win,
        is_dry_win: analysis.is_dry_win,
        results: results
    };
}

function analyzeGame(players) {
    const alivePlayers = players.filter(p => p.killed_when === '0' || !p.killed_when);

    // Определяем победителя
    const aliveMafia = alivePlayers.filter(p => p.role === 'Мафия' || p.role === 'Дон').length;
    const aliveCivilians = alivePlayers.filter(p => p.role === 'Мирный' || p.role === 'Шериф').length;

    const winner = aliveMafia === 0 ? 'Мирные' : 'Мафия';

    // Чистая победа мирных
    const civilianPlayers = players.filter(p => p.role === 'Мирный' || p.role === 'Шериф');
    const mafiaPlayers = players.filter(p => p.role === 'Мафия' || p.role === 'Дон');

    // Чистая победа = мирные победили И ни один мирный не был убит голосованием днём
    const noCivilianKilledByVote = !civilianPlayers.some(p => p.killed_when && p.killed_when.includes('D'));

    const is_clean_win = winner === 'Мирные' && noCivilianKilledByVote;

    // Победа мафии в сухую
    const is_dry_win = winner === 'Мафия' && mafiaPlayers.every(p => p.killed_when === '0' || !p.killed_when);

    // Угадайка (3 игрока на последнем голосовании)
    const lastVoteDay = Math.max(...players
        .filter(p => p.killed_when && p.killed_when.includes('D'))
        .map(p => getKillDay(p.killed_when))
        .filter(d => d > 0), 0);

    const guessingPlayers = lastVoteDay > 0 ?
        players.filter(p => {
            if (!p.killed_when || p.killed_when === '0') return true;
            const killDay = getKillDay(p.killed_when);
            return killDay >= lastVoteDay;
        }).map(p => p.name) : [];

    const is_guessing = guessingPlayers.length === 3;

    return {
        winner: winner,
        is_clean_win: is_clean_win,
        is_dry_win: is_dry_win,
        is_guessing: is_guessing,
        guessing_players: is_guessing ? guessingPlayers : []
    };
}

function calculateSheriffChecks(sheriff, checkedNumbers, allPlayers) {
    let black = 0;
    let red = 0;

    checkedNumbers.forEach(num => {
        const index = num - 1;
        if (index >= 0 && index < allPlayers.length) {
            const checkedPlayer = allPlayers[index];
            if (checkedPlayer.role === 'Мафия' || checkedPlayer.role === 'Дон') {
                black++;
            } else {
                red++;
            }
        }
    });

    return { black, red };
}

function parseSheriffChecks(checksStr) {
    if (!checksStr || !checksStr.trim()) return [];
    return checksStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
}

function getKillDay(killedWhen) {
    if (!killedWhen || killedWhen === '0') return 0;
    const match = killedWhen.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
}
