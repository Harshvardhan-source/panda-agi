from services.files import FilesService
from panda_agi.envs.base_env import BaseEnv
from pxml import DashboardCompiler
import logging

logger = logging.getLogger(__name__)


class PXMLService:

    @staticmethod
    async def compile_pxml(xml_content: str, env: BaseEnv) -> str:
        """
        Compile a PXML file and return the compiled data.
        """
        try:
            dashboard_compiler = DashboardCompiler()
            dashboard_data = dashboard_compiler.xml_parser.parse(xml_content)

            csv_file_path = dashboard_data["metadata"].file_path

            file_bytes, _ = await FilesService.get_file_from_env(csv_file_path, env)
            csv_content = file_bytes.decode("utf-8")
            html_content = dashboard_compiler.compile_dashboard_with_csv(
                dashboard_data, csv_content
            )
            logger.info(f"TEST DEBUG: HTML content: {html_content[:100]}")
            return html_content
        except Exception as e:
            logger.exception(f"Error compiling PXML file: {e}")
            raise Exception(f"Failed to compile PXML file")
