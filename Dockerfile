#
# RcloneBrowser Dockerfile
#

FROM jlesage/baseimage-gui:alpine-3.21-v4

# Define build arguments
ARG RCLONE_VERSION=current

# Define environment variables
ENV ARCH=amd64

# Define working directory.
WORKDIR /tmp

# Install Rclone Browser dependencies
RUN apk -U upgrade --no-cache && \
    apk --no-cache add \
      curl \
      ca-certificates \
      fuse \
      wget \
      qt5-qtbase \
      qt5-qtbase-x11 \
      qt5-qtmultimedia \
      libstdc++ \
      libgcc \
      dbus \
      xterm \
      openbox \
      font-terminus \
    && add-pkg font-wqy-zenhei --repository https://dl-cdn.alpinelinux.org/alpine/edge/community \
    && cd /tmp \
    && wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub \
    && wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r1/glibc-2.35-r1.apk \
    && apk add glibc-2.35-r1.apk \
    && rm glibc-2.35-r1.apk \
    && wget -q http://downloads.rclone.org/rclone-${RCLONE_VERSION}-linux-${ARCH}.zip \
    && unzip /tmp/rclone-${RCLONE_VERSION}-linux-${ARCH}.zip \
    && mv /tmp/rclone-*-linux-${ARCH}/rclone /usr/bin \
    && rm -r /tmp/rclone* && \

    apk add --no-cache --virtual=build-dependencies \
        build-base \
        cmake \
        make \
        gcc \
        git \
        qt5-qtbase qt5-qtmultimedia-dev qt5-qttools-dev && \

# Compile RcloneBrowser
    git clone https://github.com/Alkl58/RcloneBrowser.git /tmp && \
    mkdir /tmp/build && \
    cd /tmp/build && \
    cmake -DCMAKE_CXX_FLAGS="-Wno-error=deprecated-declarations" .. && \
    cmake --build . && \
    ls -l /tmp/build && \
    cp /tmp/build/build/rclone-browser /usr/bin  && \

    # cleanup
     apk del --purge build-dependencies && \
    rm -rf /tmp/*

# Maximize only the main/initial window.
#RUN \
#    sed-patch 's/<application type="normal">/<application type="normal" title="Rclone Browser">/' \
#        /etc/xdg/openbox/rc.xml

# Generate and install favicons.
RUN \
    APP_ICON_URL=https://github.com/rclone/rclone/raw/master/graphics/logo/logo_symbol/logo_symbol_color_512px.png && \
    install_app_icon.sh "$APP_ICON_URL"

# Add files.
COPY --chmod=755 rootfs/ /
COPY VERSION /
# Set environment variables.
ENV APP_NAME="RcloneBrowser" \
    S6_KILL_GRACETIME=8000

# Define mountable directories.
VOLUME ["/config"]
VOLUME ["/media"]

# Metadata.
LABEL \
      org.label-schema.name="rclonebrowser" \
      org.label-schema.description="Docker container for RcloneBrowser" \
      org.label-schema.version="unknown" \
      org.label-schema.vcs-url="https://github.com/kevinzfjiang/dockerfile/tree/master/rclonebrowser" \
      org.label-schema.schema-version="1.0"