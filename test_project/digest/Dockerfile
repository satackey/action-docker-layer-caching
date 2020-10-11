FROM alpine:latest@sha256:a15790640a6690aa1730c38cf0a440e2aa44aaca9b0e8931a9f2b0d7cc90fd65 AS data
RUN date > /now1.txt
RUN date > /now2.txt
RUN date > /now3.txt

FROM scratch
COPY --from=data /now3.txt /data_stage_built_at.txt
