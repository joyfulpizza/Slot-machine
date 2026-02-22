import express from "express";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DB_FILE = "./leaderboard.json";

function loadDB() {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let leaderboard = loadDB();
let globalStats = {
    totalSpins: 0,
    jackpotHits: 0
};

function spinSlots() {
    const roll = Math.random() * 100;

    if (roll < 0.1) {
        return { digits:[7,7,7], rarity:"⭐ SPECIAL", color:"gold", score:1000 };
    }
    if (roll < 1.0) {
        let third;
        do { third = Math.floor(Math.random()*10); } while(third===7);
        return { digits:[7,7,third], rarity:"MYTHICAL", color:"purple", score:500 };
    }
    if (roll < 5.0) {
        let num;
        do { num = Math.floor(Math.random()*10); } while(num===7);
        return { digits:[num,num,num], rarity:"LEGENDARY", color:"orange", score:250 };
    }
    if (roll < 35.0) {
        let num = Math.floor(Math.random()*10);
        let other;
        do { other = Math.floor(Math.random()*10); } while(other===num);
        const arr = [
            [num,num,other],
            [num,other,num],
            [other,num,num]
        ];
        return { digits: arr[Math.floor(Math.random()*3)], rarity:"RARE", color:"green", score:100 };
    }

    let a,b,c;
    do {
        a = Math.floor(Math.random()*10);
        b = Math.floor(Math.random()*10);
        c = Math.floor(Math.random()*10);
    } while(a===b || b===c || a===c);

    return { digits:[a,b,c], rarity:"COMMON", color:"gray", score:10 };
}

app.post("/spin", (req,res)=>{
    const { nickname } = req.body;
    if(!nickname) return res.status(400).json({error:"Nickname required"});

    const result = spinSlots();
    globalStats.totalSpins++;

    let player = leaderboard.find(p=>p.nickname===nickname);

    if(!player){
        player = { nickname, bestScore:0, streak:0, totalSpins:0 };
        leaderboard.push(player);
    }

    player.totalSpins++;

    if(result.score >= 250){
        player.streak++;
    } else {
        player.streak = 0;
    }

    if(result.score > player.bestScore){
        player.bestScore = result.score;
        player.bestRarity = result.rarity;
    }

    if(result.rarity === "⭐ SPECIAL"){
        globalStats.jackpotHits++;
    }

    leaderboard.sort((a,b)=>b.bestScore-a.bestScore);
    leaderboard = leaderboard.slice(0,15);

    saveDB(leaderboard);

    res.json({
        ...result,
        streak: player.streak,
        stats: globalStats
    });
});

app.get("/leaderboard",(req,res)=>{
    res.json(leaderboard);
});

app.listen(PORT,()=>{
    console.log("Arcade running on port",PORT);
});
