// server.js
const express = require("express");
const cors = require("cors");
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Rota: login
app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios" });
    }
    try {
        // SEM ALIAS: Seleciona as colunas com seus nomes originais
        const [results] = await pool.query(
            "SELECT id_usuario, nome_usuario, email, imagem FROM tb_usuarios WHERE email = ? AND senha = ?",
            [email, senha]
        );

        if (results.length > 0) {
            const user = results[0];
            // AJUSTE NO CÓDIGO: Monta o objeto de resposta no formato esperado pelo frontend
            const responseUser = {
                id_usuario: user.id_usuario,
                nome_usuario: user.nome_usuario,
                email: user.email,
                foto_perfil: user.imagem // Mapeia 'imagem' para 'foto_perfil'
            };
            res.json(responseUser);
        } else {
            res.status(401).json({ erro: "E-mail ou senha incorretos" });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json(err);
    }
});

// Rota: listar todas as atividades
app.get("/atividades", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const offset = (page - 1) * limit;
    const tipo = req.query.tipo;

    // SEM ALIAS: Seleciona as colunas com seus nomes originais
    let query = `
        SELECT 
            a.id_atividade,
            a.tipo_atividade,
            a.distancia_percorrida,
            a.duracao_atividade,
            a.quantidade_calorias,
            a.createdAt,
            u.nome_usuario,
            u.imagem,
            (SELECT COUNT(*) FROM tb_curtida WHERE id_atividade = a.id_atividade) as likes,
            (SELECT COUNT(*) FROM tb_comentario WHERE id_atividade = a.id_atividade) as comentarios
        FROM 
            tb_atividade a
        JOIN 
            tb_usuarios u ON a.id_usuario = u.id_usuario
    `;
    const queryParams = [];

    if (tipo) {
        query += " WHERE a.tipo_atividade = ?";
        queryParams.push(tipo);
    }

    query += " ORDER BY a.createdAt DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    try {
        const [results] = await pool.query(query, queryParams);
        
        // AJUSTE NO CÓDIGO: Mapeia os resultados para o formato esperado pelo frontend
        const activities = results.map(act => ({
            id_atividade: act.id_atividade,
            tipo: act.tipo_atividade, // Mapeia 'tipo_atividade' para 'tipo'
            distancia_km: act.distancia_percorrida / 1000, // Converte para km
            duracao_min: act.duracao_atividade, // Mapeia 'duracao_atividade' para 'duracao_min'
            calorias: act.quantidade_calorias, // Mapeia 'quantidade_calorias' para 'calorias'
            data_atividade: act.createdAt, // Mapeia 'createdAt' para 'data_atividade'
            nome_usuario: act.nome_usuario,
            foto_perfil: act.imagem, // Mapeia 'imagem' para 'foto_perfil'
            likes: act.likes,
            comentarios: act.comentarios
        }));
        res.json(activities);
    } catch (err) {
        console.error("Erro ao buscar atividades:", err);
        res.status(500).json(err);
    }
});

// Rota: Criar nova atividade
app.post("/atividades", async (req, res) => {
    const { tipo, distancia, duracao, calorias, id_usuario } = req.body;
    if (!tipo || !distancia || !duracao || !calorias || !id_usuario) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO tb_atividade (tipo_atividade, distancia_percorrida, duracao_atividade, quantidade_calorias, id_usuario, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
            [tipo, distancia, duracao, calorias, id_usuario]
        );
        res.status(201).json({ id_atividade: result.insertId });
    } catch (err) {
        console.error("Erro ao criar atividade:", err);
        res.status(500).json(err);
    }
});

// Rota: Curtir/Descurtir uma atividade
app.post("/atividades/:id/like", async (req, res) => {
    const { id } = req.params;
    const { id_usuario } = req.body;

    try {
        const [existingLike] = await pool.query("SELECT * FROM tb_curtida WHERE id_atividade = ? AND id_usuario = ?", [id, id_usuario]);

        if (existingLike.length > 0) {
            await pool.query("DELETE FROM tb_curtida WHERE id_atividade = ? AND id_usuario = ?", [id, id_usuario]);
            res.json({ message: "Like removido" });
        } else {
            await pool.query("INSERT INTO tb_curtida (id_atividade, id_usuario, createdAt) VALUES (?, ?, NOW())", [id, id_usuario]);
            res.json({ message: "Atividade curtida" });
        }
    } catch (err) {
        console.error("Erro ao curtir:", err);
        res.status(500).json(err);
    }
});

// Rota: Adicionar comentário
app.post("/atividades/:id/comentarios", async (req, res) => {
    const { id } = req.params;
    const { id_usuario, comentario } = req.body;
    if (!comentario || comentario.length <= 2) {
        return res.status(400).json({ erro: "O comentário precisa ter mais de 2 caracteres." });
    }
    try {
        await pool.query(
            "INSERT INTO tb_comentario (id_atividade, id_usuario, texto, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
            [id, id_usuario, comentario]
        );
        res.status(201).json({ message: "Comentário adicionado" });
    } catch (err) {
        console.error("Erro ao comentar:", err);
        res.status(500).json(err);
    }
});


// Rota: Estatísticas gerais
app.get("/stats", async (req, res) => {
    try {
        const [totalAtividades] = await pool.query("SELECT COUNT(*) as total FROM tb_atividade");
        const [totalCalorias] = await pool.query("SELECT SUM(quantidade_calorias) as total FROM tb_atividade");
        res.json({
            qtd_atividades: totalAtividades[0].total,
            qtd_calorias: totalCalorias[0].total
        });
    } catch (err) {
        console.error("Erro ao buscar stats gerais:", err);
        res.status(500).json(err);
    }
});

// Rota: Estatísticas do usuário logado
app.get("/usuarios/:id/stats", async (req, res) => {
    const { id } = req.params;
    try {
        const [totalAtividades] = await pool.query("SELECT COUNT(*) as total FROM tb_atividade WHERE id_usuario = ?", [id]);
        const [totalCalorias] = await pool.query("SELECT SUM(quantidade_calorias) as total FROM tb_atividade WHERE id_usuario = ?", [id]);
        res.json({
            qtd_atividades: totalAtividades[0].total,
            qtd_calorias: totalCalorias[0].total
        });
    } catch (err) {
        console.error("Erro ao buscar stats do usuário:", err);
        res.status(500).json(err);
    }
});


// Iniciar servidor
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});