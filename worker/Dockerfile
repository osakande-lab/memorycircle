FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /work
ENTRYPOINT ["ffmpeg"]
# Feasibility image only; automatic jobs and scheduler are later-sprint work.
