FROM trzeci/emscripten:1.39.4

RUN apt-get install -qqy git && \
    mkdir -p /opt/epanet/build && \
    git clone --depth 1 https://github.com/OpenWaterAnalytics/EPANET /opt/epanet/src
RUN cd /opt/epanet/build && \
    emcmake cmake ../src  && \
    emmake cmake --build . --config Release
