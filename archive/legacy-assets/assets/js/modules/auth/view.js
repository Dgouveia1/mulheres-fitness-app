export const AuthView = {
    Login: () => `
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-brand">
                <h1>Espaço</h1>
                <span class="script">Mulher</span>
            </div>
            <form class="auth-form" id="login-form">
                <div class="form-group">
                    <label>E-MAIL</label>
                    <input type="email" id="email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>SENHA</label>
                    <input type="password" id="password" required placeholder="Sua senha">
                </div>
                <button type="submit" class="btn-primary">Entrar</button>
            </form>
            <div class="auth-links">
                <span>Ainda não tem conta?</span>
                <a href="/register" data-link class="btn-secondary" style="display:block; text-align:center; margin-top:10px; text-decoration:none;">Criar minha conta</a>
            </div>
        </div>
    </div>`,


    Register: () => `
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-brand">
                <h1>Junte-se ao</h1>
                <span class="script">Espaço Mulher</span>
            </div>
            <form class="auth-form" id="register-form">
                <div class="form-group">
                    <label>NOME COMPLETO</label>
                    <input type="text" id="full_name" required placeholder="Seu nome completo">
                </div>
                <div class="form-group">
                    <label>E-MAIL</label>
                    <input type="email" id="email" required placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>CPF</label>
                    <input type="text" id="cpf" required placeholder="000.000.000-00" maxlength="14" oninput="this.value = this.value.replace(/\\D/g, '').replace(/(\\d{3})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d{1,2})$/, '$1-$2')">
                </div>
                <div class="form-group">
                    <label>CELULAR</label>
                    <input type="tel" id="phone" required placeholder="(11) 99999-9999" maxlength="15" oninput="this.value = this.value.replace(/\\D/g, '').replace(/^(\\d{2})(\\d)/g, '($1) $2').replace(/(\\d)(\\d{4})$/, '$1-$2')">
                </div>
                <div class="form-group">
                    <label>SENHA</label>
                    <input type="password" id="password" required placeholder="Sua senha secreta">
                </div>
                <button type="submit" class="btn-primary">Criar Conta e Começar</button>
            </form>
            <div class="auth-links">
                <a href="/login" data-link>Já tenho cadastro</a>
            </div>
        </div>
    </div>`,

};
