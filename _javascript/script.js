document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = 'http://localhost:3000';
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    let currentPage = 1;
    let currentFilter = '';

    // Elementos do DOM
    const activityListContainer = document.getElementById('activity-list');
    const filterTabs = document.querySelectorAll('.tabs .tab-button');
    const loginLogoutButton = document.getElementById('login-logout-button');
    const loginModal = document.getElementById('login-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelButton = document.getElementById('cancel-button');
    const loginForm = document.getElementById('login-form');
    const btnAtividade = document.getElementById('btn-atividade');
    const createActivityForm = document.getElementById('create-activity-form');
    const feedSection = document.getElementById('feed-section');
    const createActivitySection = document.getElementById('create-activity-section');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageNumbersContainer = document.getElementById('page-numbers');


    // Elementos do Perfil e Stats
    const profileImg = document.getElementById('profile-img');
    const profileName = document.getElementById('profile-name');
    const statsAtividades = document.getElementById('stats-atividades');
    const statsCalorias = document.getElementById('stats-calorias');

    // --- FUNÇÕES GLOBAIS DE INTERFACE ---

    // Função para exibir uma caixa de mensagem customizada
    const showMessage = (message, type = 'info') => {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.innerHTML = `
            <p>${message}</p>
            <button class="close-message-btn">&times;</button>
        `;

        messageBox.querySelector('.close-message-btn').addEventListener('click', () => {
            messageContainer.remove();
        });

        messageContainer.appendChild(messageBox);
        document.body.appendChild(messageContainer);
    };

    // --- FUNÇÕES DE COMUNICAÇÃO COM A API ---

    // Função para buscar e exibir as estatísticas gerais
    const fetchGeneralStats = async () => {
        try {
            const response = await fetch(`${apiUrl}/stats`);
            if (!response.ok) {
                throw new Error('Erro ao buscar estatísticas');
            }
            const stats = await response.json();
            statsAtividades.textContent = stats.qtd_atividades;
            statsCalorias.textContent = stats.qtd_calorias;
        } catch (error) {
            console.error("Falha ao carregar as estatísticas:", error);
            statsAtividades.textContent = '0';
            statsCalorias.textContent = '0';
        }
    };

    // Função para buscar e exibir as estatísticas do usuário
    const fetchUserStats = async (userId) => {
        try {
            const response = await fetch(`${apiUrl}/usuarios/${userId}/stats`);
            const data = await response.json();
            statsAtividades.textContent = data.qtd_atividades || 0;
            statsCalorias.textContent = data.qtd_calorias || 0;
        } catch (error) {
            console.error('Erro ao buscar estatísticas do usuário:', error);
            statsAtividades.textContent = '0';
            statsCalorias.textContent = '0';
        }
    };

    // Função PRINCIPAL que decide qual estatística buscar
    const updateStatsUI = () => {
        if (currentUser) {
            fetchUserStats(currentUser.id_usuario);
        } else {
            fetchGeneralStats();
        }
    };

    // Função para buscar e renderizar os comentários de uma atividade
    const fetchAndRenderComments = async (activityId, commentsContainer) => {
        try {
            const response = await fetch(`${apiUrl}/atividades/${activityId}/comentarios`);
            if (!response.ok) throw new Error('Falha ao buscar comentários');
            const comments = await response.json();

            commentsContainer.innerHTML = '';
            comments.forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment-item';
                commentElement.innerHTML = `
                    <div class="comment-user">
                        <img src="_imagens/${comment.imagem}" alt="Avatar do usuário">
                        <span>${comment.nome_usuario}</span>
                    </div>
                    <p>${comment.texto}</p>
                `;
                commentsContainer.appendChild(commentElement);
            });
        } catch (error) {
            console.error('Erro ao buscar comentários:', error);
            commentsContainer.innerHTML = '<p>Erro ao carregar comentários.</p>';
        }
    };

    const renderActivities = (activities) => {
        activityListContainer.innerHTML = '';
        if (activities.length === 0) {
            activityListContainer.innerHTML = '<p>Nenhuma atividade encontrada para este filtro.</p>';
            return;
        }

        activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.setAttribute('data-id', activity.id_atividade);

            const date = new Date(activity.data_atividade);
            const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;

            // Verifica se o usuário está logado para aplicar a classe 'disabled-btn'
            const buttonClass = !currentUser ? 'disabled-btn' : '';

            activityElement.innerHTML = `
                <div class="activity-header">
                    <h4>${activity.tipo}</h4>
                    <span>${formattedDate}</span>
                </div>
                <div class="activity-content">
                    <div class="avatar">
                        <img src="_imagens/${activity.foto_perfil}" alt="Avatar do usuário">
                        <p class="user-name">${activity.nome_usuario}</p>
                    </div>
                    <div class="activity-details">
                        <div>
                            <div class="stat-value">${activity.distancia_km.toFixed(1)} km</div>
                            <div class="stat-label">Distância</div>
                        </div>
                        <div>
                            <div class="stat-value">${activity.duracao_min} min</div>
                            <div class="stat-label">Duração</div>
                        </div>
                        <div>
                            <div class="stat-value">${activity.calorias}</div>
                            <div class="stat-label">Calorias</div>
                        </div>
                    </div>
                    <div class="activity-social">
                        <button class="like-btn ${buttonClass}" data-id="${activity.id_atividade}">
                            <i class="fa-heart ${activity.likedByUser ? 'fas liked' : 'far'}"></i>
                            <span class="like-count">${activity.likes}</span>
                        </button>
                        <button class="comment-btn ${buttonClass}" data-id="${activity.id_atividade}">
                            <i class="far fa-comment"></i>
                            <span class="comment-count">${activity.comentarios}</span>
                        </button>
                    </div>
                </div>
                <div class="comments-section hidden" data-id="${activity.id_atividade}">
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Adicionar um comentário..." required>
                        <button type="submit" class="btn-comment-submit">Comentar</button>
                    </div>
                    <div class="comments-list">
                        </div>
                </div>
            `;
            activityListContainer.appendChild(activityElement);
        });
    };

    const fetchAndRenderActivities = async (page = 1, filter = '') => {
        try {
            const response = await fetch(`${apiUrl}/atividades?page=${page}&tipo=${filter}`);
            if (!response.ok) throw new Error('Falha ao buscar atividades');
            const activities = await response.json();

            const activitiesWithLikes = await Promise.all(activities.map(async activity => {
                let likedByUser = false;
                if (currentUser) {
                    const likeResponse = await fetch(`${apiUrl}/atividades/${activity.id_atividade}/likes/${currentUser.id_usuario}`);
                    if (likeResponse.ok) {
                        const result = await likeResponse.json();
                        likedByUser = result.liked;
                    }
                }
                return { ...activity, likedByUser };
            }));

            updateStatsUI();
            renderActivities(activitiesWithLikes);
        } catch (error) {
            console.error('Erro ao buscar atividades:', error);
            activityListContainer.innerHTML = '<p>Erro ao carregar atividades. Verifique o console.</p>';
        }
    };

    // Listener para o botão de like
    activityListContainer.addEventListener('click', async (event) => {
        const likeButton = event.target.closest('.like-btn');
        if (!likeButton) {
            return;
        }

        if (likeButton.classList.contains('disabled-btn')) {
            showMessage('Você precisa estar logado para curtir uma atividade.', 'error');
            return;
        }

        const idAtividade = parseInt(likeButton.dataset.id);
        const likeCountSpan = likeButton.querySelector('.like-count');
        const heartIcon = likeButton.querySelector('.fa-heart');

        const isCurrentlyLiked = heartIcon.classList.contains('fas');
        const originalLikes = parseInt(likeCountSpan.textContent);

        let newLikesCount;
        if (isCurrentlyLiked) {
            heartIcon.classList.remove('fas', 'liked');
            heartIcon.classList.add('far');
            newLikesCount = originalLikes - 1;
        } else {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas', 'liked');
            newLikesCount = originalLikes + 1;
        }
        likeCountSpan.textContent = newLikesCount;

        try {
            const response = await fetch(`${apiUrl}/likes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_atividade: idAtividade,
                    id_usuario: currentUser.id_usuario
                })
            });

            if (!response.ok) {
                console.error("Erro ao processar curtida no servidor.");

                if (isCurrentlyLiked) {
                    heartIcon.classList.remove('far');
                    heartIcon.classList.add('fas', 'liked');
                } else {
                    heartIcon.classList.remove('fas', 'liked');
                    heartIcon.classList.add('far');
                }
                likeCountSpan.textContent = originalLikes;
            }

        } catch (error) {
            console.error("Erro de comunicação com o servidor:", error);
            
            if (isCurrentlyLiked) {
                heartIcon.classList.remove('far');
                heartIcon.classList.add('fas', 'liked');
            } else {
                heartIcon.classList.remove('fas', 'liked');
                heartIcon.classList.add('far');
            }
            likeCountSpan.textContent = originalLikes;
        }
    });

    // Listener para o botão de comentário
    activityListContainer.addEventListener('click', async (event) => {
        const commentButton = event.target.closest('.comment-btn');
        if (!commentButton) {
            return;
        }

        if (commentButton.classList.contains('disabled-btn')) {
            showMessage('Você precisa estar logado para comentar.', 'error');
            return;
        }
        
        const activityItem = commentButton.closest('.activity-item');
        const commentsSection = activityItem.querySelector('.comments-section');

        commentsSection.classList.toggle('hidden');

        if (!commentsSection.classList.contains('hidden')) {
            const commentsList = commentsSection.querySelector('.comments-list');
            const activityId = parseInt(commentButton.dataset.id);
            fetchAndRenderComments(activityId, commentsList);
        }
    });

    // Listener para o formulário de envio de comentário
    activityListContainer.addEventListener('click', async (event) => {
        const submitButton = event.target.closest('.btn-comment-submit');
        if (!submitButton) {
            return;
        }

        if (!currentUser) {
            showMessage('Você precisa estar logado para adicionar um comentário.', 'error');
            return;
        }

        const commentsSection = submitButton.closest('.comments-section');
        const activityId = parseInt(commentsSection.dataset.id);
        const commentInput = commentsSection.querySelector('.comment-input');
        const commentText = commentInput.value.trim();

        if (commentText.length <= 2) {
            showMessage('O comentário deve ter mais de 2 caracteres.', 'error');
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/atividades/${activityId}/comentarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: currentUser.id_usuario,
                    comentario: commentText
                })
            });

            if (response.ok) {
                commentInput.value = '';
                // Atualiza a contagem de comentários (otimista)
                const commentCountSpan = commentsSection.closest('.activity-item').querySelector('.comment-count');
                commentCountSpan.textContent = parseInt(commentCountSpan.textContent) + 1;
                
                // Recarrega os comentários para exibir o novo
                const commentsList = commentsSection.querySelector('.comments-list');
                fetchAndRenderComments(activityId, commentsList);

            } else {
                const data = await response.json();
                showMessage(data.erro || 'Falha ao adicionar comentário.', 'error');
            }
        } catch (error) {
            console.error('Erro de comunicação ao adicionar comentário:', error);
            showMessage('Ocorreu um erro de comunicação ao adicionar o comentário.', 'error');
        }
    });

    // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

    const updateUIForLogin = () => {
        if (currentUser) {
            loginLogoutButton.textContent = 'Logout';
            btnAtividade.disabled = false;
            btnAtividade.classList.add('enabled');
            profileImg.src = `_imagens/${currentUser.foto_perfil}`;
            profileName.textContent = currentUser.nome_usuario;
        } else {
            loginLogoutButton.textContent = 'Login';
            btnAtividade.disabled = true;
            btnAtividade.classList.remove('enabled', 'active');
            profileImg.src = '_imagens/saepsaude.png';
            profileName.textContent = 'SAEPSaúde';
        }
        updateStatsUI();
    };

    // --- EVENT LISTENERS ---

    loginLogoutButton.addEventListener('click', () => {
        if (currentUser) {
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            updateUIForLogin();
            feedSection.classList.remove('hidden');
            createActivitySection.classList.add('hidden');
            btnAtividade.classList.remove('active');
            fetchAndRenderActivities(1, '');
        } else {
            loginModal.classList.remove('hidden');
        }
    });

    closeModalButton.addEventListener('click', () => loginModal.classList.add('hidden'));
    cancelButton.addEventListener('click', () => loginModal.classList.add('hidden'));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        try {
            const response = await fetch(`${apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const data = await response.json();
            if (response.ok) {
                currentUser = data;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUIForLogin();
                loginModal.classList.add('hidden');
                loginForm.reset();
                fetchAndRenderActivities(1, currentFilter);
            } else {
                showMessage(data.erro || "Falha no login", 'error');
            }
        } catch (error) {
            console.error("Erro no login:", error);
            showMessage("Ocorreu um erro ao tentar fazer login.", 'error');
        }
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.type;
            currentPage = 1;
            fetchAndRenderActivities(currentPage, currentFilter);
        });
    });

    btnAtividade.addEventListener('click', () => {
        if (currentUser) {
            const isFeedVisible = !feedSection.classList.contains('hidden');
            if (isFeedVisible) {
                feedSection.classList.add('hidden');
                createActivitySection.classList.remove('hidden');
                btnAtividade.classList.add('active');
            } else {
                feedSection.classList.remove('hidden');
                createActivitySection.classList.add('hidden');
                btnAtividade.classList.remove('active');
            }
        } else {
            showMessage('Você precisa estar logado para criar uma atividade.', 'error');
        }
    });

    createActivityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            showMessage("Você precisa estar logado para criar uma atividade.", 'error');
            return;
        }

        const atividade = {
            tipo: document.getElementById('tipo').value,
            distancia: parseInt(document.getElementById('distancia').value),
            duracao: parseInt(document.getElementById('duracao').value),
            calorias: parseInt(document.getElementById('calorias').value),
            id_usuario: currentUser.id_usuario
        };

        try {
            const response = await fetch(`${apiUrl}/atividades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(atividade)
            });

            if (response.ok) {
                showMessage("Atividade criada com sucesso!", 'success');
                createActivityForm.reset();
                feedSection.classList.remove('hidden');
                createActivitySection.classList.add('hidden');
                btnAtividade.classList.remove('active');
                fetchAndRenderActivities(1, currentFilter);
            } else {
                const data = await response.json();
                showMessage(data.erro || "Falha ao criar atividade.", 'error');
            }
        } catch (error) {
            console.error("Erro ao criar atividade:", error);
            showMessage("Ocorreu um erro de comunicação ao criar a atividade.", 'error');
        }
    });

    // --- INICIALIZAÇÃO ---

    updateUIForLogin();
    fetchAndRenderActivities(currentPage, currentFilter);
});