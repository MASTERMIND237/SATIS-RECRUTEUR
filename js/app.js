document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    
    // State
    const state = {
        name: '',
        email: '',
        answers: [],
        currentScreen: 'identity', // 'identity', 'intro', 'questions', 'thankyou'
        introIndex: 0,
        questionIndex: 0,
        isSubmitting: false
    };

    // Helper for transitions
    const transitionTo = (renderFunc) => {
        const card = appContainer.querySelector('.screen-card');
        if (card) {
            card.classList.remove('active');
            card.classList.add('fade-out');
            
            setTimeout(() => {
                renderFunc();
                // trigger reflow
                void appContainer.offsetWidth; 
                const newCard = appContainer.querySelector('.screen-card');
                if (newCard) {
                    // Start from default invisible state, then add active
                    requestAnimationFrame(() => {
                        newCard.classList.add('active');
                    });
                }
            }, 500); // Wait for CSS transition (0.5s)
        } else {
            renderFunc();
            requestAnimationFrame(() => {
                const newCard = appContainer.querySelector('.screen-card');
                if (newCard) newCard.classList.add('active');
            });
        }
    };

    // Form submission wrapper
    const handleFormSubmit = (e, callback) => {
        e.preventDefault();
        callback();
    };

    // Render Methods
    const renderIdentityScreen = () => {
        appContainer.innerHTML = `
            <div class="screen-card">
                <h1>Bienvenue</h1>
                <p>Pour commencer, merci de nous indiquer vos informations de contact.</p>
                <form id="identity-form">
                    <div class="form-group">
                        <label for="name">Prénom et Nom</label>
                        <input type="text" id="name" required placeholder="Jean Dupont">
                    </div>
                    <div class="form-group">
                        <label for="email">Adresse Email</label>
                        <input type="email" id="email" required placeholder="jean.dupont@email.com">
                    </div>
                    <p style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 1rem;">
                        Note légale: Vos données seront uniquement utilisées dans le cadre de ce recrutement.
                    </p>
                    <button type="submit">Commencer</button>
                </form>
            </div>
        `;

        document.getElementById('identity-form').addEventListener('submit', (e) => {
            handleFormSubmit(e, () => {
                state.name = document.getElementById('name').value;
                state.email = document.getElementById('email').value;
                state.currentScreen = 'intro';
                transitionTo(renderIntroScreen);
            });
        });
    };

    const renderIntroScreen = () => {
        const intro = config.introScreens[state.introIndex];
        appContainer.innerHTML = `
            <div class="screen-card text-center">
                <div class="progress">Écran ${state.introIndex + 1} / ${config.introScreens.length}</div>
                <h2>${intro.title}</h2>
                <p>${intro.text}</p>
                <button id="intro-btn">${intro.buttonText}</button>
            </div>
        `;

        document.getElementById('intro-btn').addEventListener('click', () => {
            state.introIndex++;
            if (state.introIndex < config.introScreens.length) {
                transitionTo(renderIntroScreen);
            } else {
                state.currentScreen = 'questions';
                transitionTo(renderQuestionScreen);
            }
        });
    };

    const renderQuestionScreen = () => {
        const question = config.questions[state.questionIndex];
        const existingAnswer = state.answers[state.questionIndex] ? state.answers[state.questionIndex].answer : '';
        
        appContainer.innerHTML = `
            <div class="screen-card">
                <div class="progress">Question ${state.questionIndex + 1} / ${config.questions.length}</div>
                <h2>${question.text}</h2>
                <form id="question-form">
                    <div class="form-group">
                        <textarea id="answer" required placeholder="Votre réponse...">${existingAnswer}</textarea>
                    </div>
                    <div class="button-group">
                        ${state.questionIndex > 0 ? '<button type="button" id="prev-btn" class="btn-secondary">Précédent</button>' : ''}
                        <button type="submit" id="submit-answer-btn">
                            ${state.questionIndex === config.questions.length - 1 ? 'Terminer et Envoyer' : 'Question Suivante'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        if (state.questionIndex > 0) {
            document.getElementById('prev-btn').addEventListener('click', () => {
                const answerText = document.getElementById('answer').value;
                if (answerText.trim() !== '') {
                    state.answers[state.questionIndex] = {
                        question: question.text,
                        answer: answerText
                    };
                }
                state.questionIndex--;
                transitionTo(renderQuestionScreen);
            });
        }

        document.getElementById('question-form').addEventListener('submit', (e) => {
            handleFormSubmit(e, () => {
                const answerText = document.getElementById('answer').value;
                state.answers[state.questionIndex] = {
                    question: question.text,
                    answer: answerText
                };

                state.questionIndex++;
                if (state.questionIndex < config.questions.length) {
                    transitionTo(renderQuestionScreen);
                } else {
                    submitData();
                }
            });
        });
    };

    const renderThankYouScreen = () => {
        const ty = config.thankYou;
        const msg = ty.message.replace('{name}', state.name);
        
        appContainer.innerHTML = `
            <div class="screen-card text-center">
                <span class="emoji">${ty.emoji}</span>
                <h2>${msg}</h2>
                <p style="margin-bottom: 0;">${ty.footer}</p>
            </div>
        `;
    };

    const submitData = async () => {
        // Show loading state on the last button
        const btn = document.getElementById('submit-answer-btn');
        if(btn) {
            btn.disabled = true;
            btn.textContent = 'Envoi en cours...';
        }

        // Format answers for email
        let formattedAnswers = '';
        state.answers.forEach((item, index) => {
            formattedAnswers += `Q${index + 1}: ${item.question}\nR${index + 1}: ${item.answer}\n\n`;
        });

        const payload = {
            name: state.name,
            email: state.email,
            answers: formattedAnswers,
            _subject: `📬 Nouvelle soumission Satis-Tuteur - ${state.name}`
        };

        try {
            const response = await fetch(`https://formspree.io/f/${config.formspreeId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Erreur réseau');
            }

            state.currentScreen = 'thankyou';
            transitionTo(renderThankYouScreen);

        } catch (error) {
            console.error("Erreur lors de l'envoi:", error);
            alert("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
            if(btn) {
                btn.disabled = false;
                btn.textContent = 'Réessayer';
            }
        }
    };

    // Init app
    renderIdentityScreen();
    // Add active class on next frame for initial animation
    requestAnimationFrame(() => {
        const card = appContainer.querySelector('.screen-card');
        if (card) card.classList.add('active');
    });
});
