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
        const [results] = await pool.query(
            "SELECT id_usuario, nome_usuario, email, imagem FROM tb_usuarios WHERE email = ? AND senha = ?",
            [email, senha]
        );

        if (results.length > 0) {
            const user = results[0];
            const responseUser = {
                id_usuario: user.id_usuario,
                nome_usuario: user.nome_usuario,
                email: user.email,
                foto_perfil: user.imagem
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
    const perPage = parseInt(req.query.perPage) || 4;
    const offset = (page - 1) * perPage;
    const tipo = req.query.tipo;

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

    // O filtro 'all' agora é tratado corretamente.
    // A cláusula WHERE só é adicionada se o tipo for válido.
    if (tipo && tipo !== 'all') {
        query += " WHERE a.tipo_atividade = ?";
        queryParams.push(tipo);
    }

    query += " ORDER BY a.createdAt DESC LIMIT ? OFFSET ?";
    queryParams.push(perPage, offset);

    try {
        const [results] = await pool.query(query, queryParams);

        const activities = results.map(act => ({
            id_atividade: act.id_atividade,
            tipo: act.tipo_atividade,
            distancia_km: act.distancia_percorrida / 1000,
            duracao_min: act.duracao_atividade,
            calorias: act.quantidade_calorias,
            data_atividade: act.createdAt,
            nome_usuario: act.nome_usuario,
            foto_perfil: act.imagem,
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

// Rota: Obter comentários de uma atividade
app.get("/atividades/:id/comentarios", async (req, res) => {
    const { id } = req.params;
    try {
        const [comments] = await pool.query(
            "SELECT c.texto, c.createdAt, u.nome_usuario, u.imagem FROM tb_comentario c JOIN tb_usuarios u ON c.id_usuario = u.id_usuario WHERE c.id_atividade = ? ORDER BY c.createdAt DESC",
            [id]
        );
        res.json(comments);
    } catch (err) {
        console.error("Erro ao buscar comentários:", err);
        res.status(500).json(err);
    }
});

// Rota: Adicionar/Remover curtida
app.post("/likes", async (req, res) => {
    const { id_atividade, id_usuario } = req.body;
    try {
        const [existingLike] = await pool.query(
            "SELECT * FROM tb_curtida WHERE id_atividade = ? AND id_usuario = ?",
            [id_atividade, id_usuario]
        );

        if (existingLike.length > 0) {
            await pool.query(
                "DELETE FROM tb_curtida WHERE id_atividade = ? AND id_usuario = ?",
                [id_atividade, id_usuario]
            );
            return res.status(200).json({ liked: false });
        } else {
            await pool.query(
                "INSERT INTO tb_curtida (id_atividade, id_usuario) VALUES (?, ?)",
                [id_atividade, id_usuario]
            );
            return res.status(200).json({ liked: true });
        }
    } catch (err) {
        console.error("Erro ao processar curtida:", err);
        return res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// Rota: Verificar se o usuário curtiu uma atividade
app.get("/atividades/:id/likes/:id_usuario", async (req, res) => {
    const { id, id_usuario } = req.params;
    try {
        const [existingLike] = await pool.query(
            "SELECT * FROM tb_curtida WHERE id_atividade = ? AND id_usuario = ?",
            [id, id_usuario]
        );
        res.json({ liked: existingLike.length > 0 });
    } catch (err) {
        console.error("Erro ao verificar curtida:", err);
        res.status(500).json({ erro: "Erro interno no servidor" });
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

// Rota: Total de atividades com base no filtro
app.get("/atividades/total", async (req, res) => {
    const tipo = req.query.tipo;
    let query = "SELECT COUNT(*) as total FROM tb_atividade";
    const queryParams = [];

    if (tipo) {
        query += " WHERE tipo_atividade = ?";
        queryParams.push(tipo);
    }

    try {
        const [results] = await pool.query(query, queryParams);
        res.json({ total: results[0].total });
    } catch (err) {
        console.error("Erro ao buscar total de atividades:", err);
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