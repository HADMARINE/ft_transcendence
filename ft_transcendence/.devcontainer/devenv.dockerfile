FROM ubuntu:22.04

ENV TIMEZONE=GMT
ENV USERNAME=devuser

LABEL maintainer="HADMARINE <contact@hadmarine.com>"

SHELL ["/bin/bash", "-c"]

# RUN rm /bin/sh && ln -s /bin/bash /bin/sh

RUN ln -snf /usr/share/zoneinfo/${TIMEZONE} /etc/localtime && echo ${TIMEZONE} > /etc/timezone
RUN apt -y update
RUN apt -y install build-essential curl gnupg git zsh nano language-pack-en sudo lsb-release ca-certificates
RUN mkdir -p /etc/apt/keyrings

RUN update-locale
RUN adduser --shell /bin/zsh --disabled-password --gecos "" ${USERNAME}
# RUN chmod 777 -R /home/${USERNAME}
RUN adduser ${USERNAME} sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# RUN chsh -s ~/.zshrc

USER ${USERNAME}
WORKDIR /home/${USERNAME}


RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN sudo apt update
RUN sudo apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    # && source ~/.bashrc \


RUN sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && source ~/.profile \
    && nvm install node \
    && npm i -g yarn


# ZSH configuration
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
RUN git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
RUN git clone https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

RUN curl -o ~/.zshrc https://gist.githubusercontent.com/HADMARINE/0fb134d56193d1b10be8d985e2e2f9a1/raw/d523a828dfc693ab8258c3f0571ce3c9faa984ea/.zshrc

RUN git config --global core.autocrlf input
RUN source ~/.profile && npm i -g @nestjs/cli

CMD [ "zsh" ]